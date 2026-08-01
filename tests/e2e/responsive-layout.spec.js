import { expect, test } from "@playwright/test";


const publicPages = [
  "/html/index.html?intro=0",
  "/html/about-association.html",
  "/html/about-association-detail.html",
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
    problems.push(`请求失败：${request.method()} ${request.url()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      problems.push(`资源响应异常：${response.status()} ${response.url()}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`控制台错误：${message.text()}`);
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

  await page.goto("/html/about-association-detail.html");
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
    await expect(page.locator(".table-scroll-hint")).toBeVisible();
    await page.goto("/html/trainings.html");
    await expect(page.locator(".table-scroll-hint")).toBeVisible();

    await page.goto("/html/about-association-detail.html");
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
        "/html/about-association-detail.html",
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
