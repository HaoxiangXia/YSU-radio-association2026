import { expect, test } from "@playwright/test";


const publicPages = [
  "/html/index.html?intro=0",
  "/html/about-association.html",
  "/html/activities.html",
  "/html/competition-activities.html",
  "/html/recreational-activities.html",
  "/html/honors.html",
  "/html/trainings.html",
  "/html/membership-application.html",
  "/html/admission.html",
  "/html/admin-login.html",
];


function monitorPage(page) {
  const problems = [];
  page.on("pageerror", (error) => problems.push(`页面异常：${error.message}`));
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    if (request.resourceType() === "media" && failure?.errorText === "net::ERR_ABORTED") {
      return;
    }
    problems.push(`请求失败：${request.method()} ${request.url()}`);
  });
  page.on("response", (response) => {
    // 匿名访问登录页时 checkAuth 探测会话得到 401，属预期响应（HttpOnly Cookie 无法在前端判存）
    if (response.status() === 401 && response.url().endsWith("/api/recruitment-officers/verify")) {
      return;
    }
    if (response.status() >= 400) {
      problems.push(`资源响应异常：${response.status()} ${response.url()}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    // 上述预期 401 对应的控制台资源加载报错一并豁免（response 监听已按 URL 覆盖真实异常）
    if (
      message.text().includes("401") &&
      message.location()?.url?.endsWith("/api/recruitment-officers/verify")
    ) {
      return;
    }
    problems.push(`控制台错误：${message.text()}`);
  });
  return problems;
}


async function loadLazyContent(page) {
  const images = page.locator('img[src]:not([src=""])');
  for (let index = 0; index < await images.count(); index += 1) {
    await images.nth(index).scrollIntoViewIfNeeded();
  }
  await expect
    .poll(() =>
      images.evaluateAll((elements) =>
        elements.every((image) => image.complete && image.naturalWidth > 0),
      ),
    )
    .toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
}


test("公开页面在目标视口无横向溢出且只加载响应式图片", async ({ page }, testInfo) => {
  const problems = monitorPage(page);

  for (const path of publicPages) {
    await page.goto(path);
    await loadLazyContent(page);

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      )
      .toBe(true);

    const imageAudit = await page.locator("img").evaluateAll((images) =>
      images
        .filter((image) => image.getAttribute("src"))
        .map((image) => ({
          alt: image.alt,
          currentSrc: image.currentSrc,
          naturalWidth: image.naturalWidth,
          isLogo: image.currentSrc.includes("/image/brand/association-emblem-white.png"),
          hasSrcset: Boolean(image.getAttribute("srcset")),
          hasSizes: Boolean(image.getAttribute("sizes")),
        })),
    );
    for (const image of imageAudit) {
      expect(image.naturalWidth, `${path} 图片未加载：${image.alt}`).toBeGreaterThan(0);
      if (!image.isLogo) {
        expect(image.currentSrc, `${path} 未使用 WebP：${image.alt}`).toMatch(/\.webp(?:$|\?)/);
        expect(image.hasSrcset, `${path} 缺少 srcset：${image.alt}`).toBe(true);
        expect(image.hasSizes, `${path} 缺少 sizes：${image.alt}`).toBe(true);
      }
    }
  }

  expect(problems).toEqual([]);

  await page.goto("/html/about-association.html");
  const departmentMediaAudit = await page.locator(".department-card").evaluateAll((cards) =>
    cards.map((card) => {
      const gallery = card.querySelector(".department-card__gallery");
      const image = card.querySelector(".department-card__photo");
      const media = card.querySelector(".department-card__media");
      const galleryRect = gallery.getBoundingClientRect();
      const mediaRect = media.getBoundingClientRect();
      return {
        galleryRatio: galleryRect.width / galleryRect.height,
        mediaHeight: mediaRect.height,
        imageObjectFit: getComputedStyle(image).objectFit,
      };
    }),
  );
  for (const media of departmentMediaAudit) {
    expect(media.galleryRatio).toBeGreaterThan(1.59);
    expect(media.galleryRatio).toBeLessThan(1.61);
    expect(media.imageObjectFit).toBe("cover");
    expect(media.mediaHeight).toBeLessThan(600);
  }

  const firstGallery = page.locator(".department-card__gallery").first();
  const firstGalleryBefore = await firstGallery.boundingBox();
  await page.locator(".department-card__media-control--next").first().click();
  await expect
    .poll(async () => {
      const after = await firstGallery.boundingBox();
      return after ? Math.abs(after.height - firstGalleryBefore.height) : Number.POSITIVE_INFINITY;
    })
    .toBeLessThanOrEqual(1);

  if (testInfo.project.name.startsWith("mobile")) {
    await page.goto("/html/honors.html");
    // 荣誉页榜单仅 3 列，窄屏直接收缩列宽展示，按设计无横向滚动提示（styles.css，411afca）
    await expect(page.locator(".table-scroll-hint")).toBeHidden();
    await page.goto("/html/trainings.html");
    await expect(page.locator(".table-scroll-hint")).toBeVisible();

    await page.goto("/html/about-association.html");
    await expect(page.locator(".department-card__media-control").first()).toBeVisible();
    const controlBox = await page.locator(".department-card__media-control").first().boundingBox();
    expect(controlBox.width).toBeGreaterThanOrEqual(43.5);
    expect(controlBox.height).toBeGreaterThanOrEqual(43.5);
    const detailBox = await page.locator(".department-card__toggle").first().boundingBox();
    expect(detailBox.height).toBeGreaterThanOrEqual(43.5);

    const firstDepartment = page.locator(".department-card").first();
    const firstToggle = firstDepartment.locator(".department-card__toggle");
    const firstDetail = firstDepartment.locator(".department-card__detail");
    await expect(firstDetail).not.toBeVisible();
    await firstToggle.click();
    await expect(firstToggle).toHaveAttribute("aria-expanded", "true");
    await expect(firstDetail).toBeVisible();
  } else {
    const zoomEquivalentViewports = [
      { width: 960, height: 600 },
      { width: 720, height: 450 },
    ];
    for (const viewport of zoomEquivalentViewports) {
      await page.setViewportSize(viewport);
      for (const path of [
        "/html/about-association.html",
      ]) {
        await page.goto(path);
        await loadLazyContent(page);
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth + 1,
            ),
          )
          .toBe(true);
      }
    }
  }
});


test("tall desktop viewport keeps the footer at the page edge", async ({ page }, testInfo) => {
  if (testInfo.project.name !== "desktop-chromium") return;

  await page.setViewportSize({ width: 1440, height: 1400 });
  await page.goto("/html/activities.html");
  await expect(page.locator(".footer")).toBeVisible();

  const layout = await page.evaluate(() => {
    const footer = document.querySelector(".footer");
    const footerRect = footer.getBoundingClientRect();
    return {
      documentHeight: document.documentElement.scrollHeight,
      footerBottom: footerRect.bottom,
      viewportHeight: window.innerHeight,
    };
  });

  expect(layout.footerBottom).toBeGreaterThanOrEqual(layout.viewportHeight - 1);
  expect(Math.abs(layout.documentHeight - layout.footerBottom)).toBeLessThanOrEqual(1);
});


test("mobile menu stays above video and scrolls inside a short viewport", async ({ page }, testInfo) => {
  if (!testInfo.project.name.startsWith("mobile")) return;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/html/index.html?intro=0");
  await page.locator("video").first().evaluate((el) => el.scrollIntoView({ block: "start" }));

  const menuButton = page.locator(".menu-btn");
  const menu = page.locator(".mobile-menu");
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  await expect(menu).toHaveClass(/open/);
  await expect
    .poll(() =>
      menu.evaluate((menuElement) => {
        const style = getComputedStyle(menuElement);
        return style.opacity === "1" && style.visibility === "visible";
      }),
    )
    .toBe(true);

  const overlap = await page.evaluate(() => {
    const menuElement = document.querySelector(".mobile-menu");
    const video = document.querySelector("video");
    const menuRect = menuElement.getBoundingClientRect();
    const videoRect = video.getBoundingClientRect();
    const left = Math.max(menuRect.left, videoRect.left);
    const right = Math.min(menuRect.right, videoRect.right);
    const top = Math.max(menuRect.top, videoRect.top);
    const bottom = Math.min(menuRect.bottom, videoRect.bottom);
    const hasOverlap = right > left && bottom > top;
    const topElement = hasOverlap
      ? document.elementFromPoint((left + right) / 2, (top + bottom) / 2)
      : null;
    return {
      hasOverlap,
      videoOwnsOverlap: Boolean(
        topElement && (topElement === video || video.contains(topElement)),
      ),
    };
  });

  expect(overlap.hasOverlap).toBe(true);
  expect(overlap.videoOwnsOverlap).toBe(false);

  await page.setViewportSize({ width: 320, height: 400 });
  const compactMenu = await menu.evaluate((menuElement) => {
    const rect = menuElement.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      clientHeight: menuElement.clientHeight,
      overflowY: getComputedStyle(menuElement).overflowY,
      scrollHeight: menuElement.scrollHeight,
      viewportHeight: window.innerHeight,
    };
  });

  expect(compactMenu.bottom).toBeLessThanOrEqual(compactMenu.viewportHeight + 1);
  expect(compactMenu.overflowY).toBe("auto");
  expect(compactMenu.scrollHeight).toBeGreaterThan(compactMenu.clientHeight);
});
