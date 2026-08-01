import { expect, test } from "@playwright/test";


function monitorPage(page) {
  const problems = [];
  page.on("pageerror", (error) => problems.push(`页面异常：${error.message}`));
  page.on("requestfailed", (request) => {
    problems.push(`请求失败：${request.method()} ${request.url()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      problems.push(`服务端错误：${response.status()} ${response.url()}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      problems.push(`控制台错误：${message.text()}`);
    }
  });
  return problems;
}


async function expectHealthyLayout(page, problems) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
  expect(problems).toEqual([]);
}

async function expectMinimumTouchTarget(locator) {
  await expect
    .poll(async () => {
      const box = await locator.boundingBox();
      return box ? Math.min(box.width, box.height) : 0;
    })
    .toBeGreaterThanOrEqual(43.5);
}


function fakeApplicant(testInfo, offset = 0) {
  const projectOffsets = {
    "desktop-chromium": 0,
    "mobile-320": 50,
    "mobile-390": 100,
  };
  const projectOffset = projectOffsets[testInfo.project.name] ?? 150;
  const unique = projectOffset + offset;
  return {
    studentId: String(202600001000 + unique),
    phone: String(13800001000 + unique),
  };
}


test("首页可完整加载且没有损坏资源或横向溢出", async ({ page }) => {
  const problems = monitorPage(page);

  await page.goto("/html/index.html?intro=0");

  await expect(page.getByRole("heading", { name: "燕山大学无线电爱好者协会" })).toBeVisible();
  await expect(page.getByRole("link", { name: "加入我们" })).toBeVisible();
  await expectHealthyLayout(page, problems);
});


test("申请人可读取业务配置并提交入会申请", async ({ page }, testInfo) => {
  const problems = monitorPage(page);
  const applicant = fakeApplicant(testInfo, 1);

  await page.goto("/html/membership-application.html");
  await expect(page.locator("#submit-btn")).toBeEnabled();
  await expect(page.locator("#application-notice")).toContainText("开放入会申请");

  await page.locator("#registration-name").fill("自动化申请人");
  await page.locator("#registration-student-id").fill(applicant.studentId);
  await page.locator("#membership-application-college").selectOption({
    label: "信息科学与工程学院",
  });
  await page.locator("#membership-application-grade").selectOption({
    label: "2026级",
  });
  await page.locator("#registration-phone").fill(applicant.phone);
  await page.locator("#registration-email").fill("browser@example.test");
  await page
    .locator("#registration-self-introduction")
    .fill("这是 Playwright 自动化测试使用的自我介绍内容。");
  await page.locator("#registration-expectation").fill("希望参与协会技术活动。");
  await page.locator("#privacy-accepted").check();
  await page.locator("#cross-border-accepted").check();
  await page.locator("#submit-btn").click();

  await expect(page.locator("#success-modal")).toHaveClass(/open/);
  await expect(page.locator("#success-title")).toHaveText("入会申请提交成功！");
  await expectHealthyLayout(page, problems);
});


test("负责人可登录、查看安全文本、导出并删除申请", async ({
  page,
  request,
}, testInfo) => {
  const problems = monitorPage(page);
  const applicant = fakeApplicant(testInfo, 2);
  const unsafeName = "<img src=x onerror=alert(1)>";
  const createResponse = await request.post("/api/membership-applications", {
    data: {
      name: unsafeName,
      studentId: applicant.studentId,
      college: "机械工程学院",
      grade: "2025级",
      phone: applicant.phone,
      email: "officer-flow@example.test",
      self_introduction: "这是后台浏览器流程使用的测试自我介绍。",
      expectation: "验证详情和删除流程。",
      privacyAccepted: true,
      crossBorderAccepted: true,
    },
  });
  expect(createResponse.status()).toBe(201);

  await page.goto("/html/admin-login.html");
  await page.locator("#admin-username").fill("officer");
  await page.locator("#admin-password").fill("test-password");
  await page.locator("#login-btn").click();
  await page.waitForURL("**/html/membership-applications.html");

  const row = page.locator("#data-body tr", { hasText: applicant.studentId });
  await expect(row).toBeVisible();
  await expect(row.locator("img")).toHaveCount(0);
  await row.getByRole("button", { name: "详情" }).click();
  await expect(page.locator("#detail-content")).toContainText(unsafeName);
  await expect(page.locator("#detail-content img")).toHaveCount(0);
  if (testInfo.project.name.startsWith("mobile")) {
    await expectMinimumTouchTarget(row.getByRole("button", { name: "详情" }));
    await expectMinimumTouchTarget(row.getByRole("button", { name: "删除" }));
    await expectMinimumTouchTarget(page.locator("#detail-close-button"));
    await expectMinimumTouchTarget(page.locator("#logout-button"));
    await expect(page.locator("#search-input")).toHaveCSS("font-size", "16px");
    await expect(page.locator("#college-filter")).toHaveCSS("font-size", "16px");
    await expect(page.locator("#grade-filter")).toHaveCSS("font-size", "16px");
  }
  await page.locator("#detail-close-button").click();

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export-button").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^membership-applications-.*\.csv$/);
  await expect(page.locator("#admin-feedback")).toContainText("CSV 已生成");

  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "删除" }).click();
  await expect(row).toHaveCount(0);
  await expect(page.locator("#admin-feedback")).toContainText("删除成功");
  await expectHealthyLayout(page, problems);
});


test("负责人可查看招新设置与录取发布页面", async ({ page }, testInfo) => {
  const problems = monitorPage(page);
  await page.goto("/html/admin-login.html");
  await page.locator("#admin-username").fill("officer");
  await page.locator("#admin-password").fill("test-password");
  await page.locator("#login-btn").click();
  await page.waitForURL("**/html/membership-applications.html");
  await page.getByRole("link", { name: "招新设置与录取结果" }).click();
  await page.waitForURL("**/html/recruitment-operations.html");

  await expect(page.locator("#cycle")).toHaveValue("e2e-cycle");
  await expect(page.locator("#cross-border-notice")).toHaveValue(/中国香港/);
  await expect(page.locator("#admissions-status")).toContainText("录取查询当前已开放");
  await expect(page.locator("#publish-button")).toBeDisabled();
  if (testInfo.project.name.startsWith("mobile")) {
    await expectMinimumTouchTarget(page.locator("#reload-config-button"));
    await expectMinimumTouchTarget(page.locator("#download-template-button"));
    await expect(page.locator("#cycle")).toHaveCSS("font-size", "16px");
  }
  await expectHealthyLayout(page, problems);
});


test("申请人只能用匹配的学号和手机查询本人录取结果", async ({ page }) => {
  const problems = monitorPage(page);

  await page.goto("/html/admission.html");
  await expect(page.locator("#query-button")).toBeEnabled();
  await page.locator("#student-id-input").fill("202600000001");
  await page.locator("#phone-input").fill("13800000001");
  await page.locator("#query-button").click();

  await expect(page.locator("#query-result")).toContainText("测试同学");
  await expect(page.locator("#query-result")).toContainText("已录取");
  await expect(page.locator("#query-result")).toContainText("嵌入式部门");
  await expect(page.locator("#query-result")).not.toContainText("13800000001");
  await expect(page.locator("#query-result")).not.toContainText("202600000001");
  await expectHealthyLayout(page, problems);

  await page.locator("#phone-input").fill("13800000009");
  await page.locator("#query-button").click();
  await expect(page.locator("#query-result")).toContainText("未找到录取结果");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
});
