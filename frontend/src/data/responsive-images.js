// 构建期读取 public/html/image-assets.js（由 scripts/generate-responsive-images.py 生成），
// 逻辑与 public/html/common.js 的 getResponsiveImageData 保持一致。
// 注意：构建时模块被打包进 dist，import.meta.url 不可用于定位源码，故用进程 cwd（frontend/）。
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const assetsSource = readFileSync(
  resolve(process.cwd(), '../public/html/image-assets.js'),
  'utf8',
);
const assets = JSON.parse(
  assetsSource.slice(assetsSource.indexOf('{'), assetsSource.lastIndexOf('}') + 1),
);

export function getResponsiveImageData(sourcePath, sizes = '100vw') {
  const asset = assets[sourcePath];
  if (!asset?.variants?.length) {
    return { src: sourcePath, srcset: '', sizes, width: '', height: '' };
  }
  const variants = [...asset.variants].sort((left, right) => left.width - right.width);
  const fallback = variants.find((variant) => variant.width >= 1200) || variants.at(-1);
  return {
    src: fallback.src,
    srcset: variants.map((variant) => `${variant.src} ${variant.width}w`).join(', '),
    sizes,
    width: asset.width,
    height: asset.height,
  };
}
