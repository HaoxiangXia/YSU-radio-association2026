// 荣誉卡片
export const honorFeatureCards = [
  {
    year: '2022年',
    badge: '第6名',
    title: '河北省高校活力团支部TOP10',
    desc: '共青团河北省委颁发，展现了协会在组织建设方面的卓越成就',
  },
  {
    year: '2024年',
    title: '燕山大学五星级社团',
    desc: '燕山大学学生社团联合会评选，是对协会全年工作的高度认可',
  },
  {
    year: '2024年',
    title: '全国大学生电子设计竞赛河北赛区优秀组织奖',
    desc: '全国大学生电子设计竞赛河北赛区组委会颁发，表彰协会在竞赛组织方面的突出贡献',
  },
];

// 2022 河北省高校活力团支部 TOP10 榜单（highlight 标记本协会所在行）
export const leagueRanking = [
  { rank: 1, school: '河北科技大学', branch: '化学与制药工程学院药学类专业2021级4班团支部' },
  { rank: 2, school: '河北工业职业技术大学', branch: '计算机技术系2020级物联网应用技术班团支部' },
  { rank: 3, school: '河北北方学院', branch: '中医学院中医学专业2020级本科1班团支部' },
  { rank: 4, school: '石家庄信息工程职业学院', branch: '网络与通信工程系活力团支部' },
  { rank: 5, school: '燕京理工学院', branch: '会计学院注会2001班团支部' },
  { rank: 6, school: '燕山大学', branch: '无线电爱好者协会团支部', highlight: true },
  { rank: 7, school: '石家庄铁道大学', branch: '电21卓越团支部' },
  { rank: 8, school: '河北科技学院', branch: '2020级工程造价(本)1班团支部' },
  { rank: 9, school: '河北体育学院', branch: '社会体育系2021级体育经济与管理1班团支部' },
  { rank: 10, school: '河北经贸大学', branch: '会计学院2020级数字财会2班团支部' },
];

// 参与竞赛
export const competitionTags = [
  '大学生创新创业训练计划项目',
  '蓝桥杯大赛',
  '河北省创新创业年会',
  '中国大学生计算机设计大赛',
  '全国大学生电子设计竞赛',
  '全国大学生电子商务"创新、创意及创业"挑战赛',
  '蓝桥杯全国软件和信息技术专业人才大赛',
  '全国大学生数学建模竞赛',
  '全国大学生恩智浦杯智能车竞赛',
  '全国大学生光电设计竞赛',
];

// 近三年竞赛成果统计
export const honorStats = [
  { value: '50+', label: '竞赛获奖' },
  { value: '30+', label: '国家级奖项' },
  { value: '25+', label: '省级奖项' },
  { value: '8+', label: '项目与论文成果' },
];

// 近三年代表性获奖证书
export const honorCertificates = [
  {
    image: '/image/honors/2026-business-elite-national-first.jpg',
    title: '全国高校商业精英挑战赛创新创业竞赛一等奖',
    meta: '2026年 · 国家级',
    img: {
      src: '/image/honors/2026-business-elite-national-first-1200.webp',
      srcset: '/image/honors/2026-business-elite-national-first-1200.webp 1200w, /image/honors/2026-business-elite-national-first-1600.webp 1600w, /image/honors/2026-business-elite-national-first-1815.webp 1815w',
      width: 1815,
      height: 1280,
      alt: '2026年全国高校商业精英挑战赛创新创业竞赛一等奖证书',
    },
  },
  {
    image: '/image/honors/2026-enterprise-simulation-national-second.jpg',
    title: '全国企业竞争模拟大赛二等奖',
    meta: '2026年 · 国家级',
    img: {
      src: '/image/honors/2026-enterprise-simulation-national-second-1200.webp',
      srcset: '/image/honors/2026-enterprise-simulation-national-second-1200.webp 1200w, /image/honors/2026-enterprise-simulation-national-second-1600.webp 1600w, /image/honors/2026-enterprise-simulation-national-second-1810.webp 1810w',
      width: 1810,
      height: 1279,
      alt: '2026年全国企业竞争模拟大赛二等奖证书',
    },
  },
  {
    image: '/image/honors/2025-engineering-practice-national-special.png',
    title: '中国大学生工程实践与创新能力大赛智能救援赛项特等奖',
    meta: '2025年 · 国家级',
    ariaLabel: '查看2025年中国大学生工程实践与创新能力大赛智能救援赛项特等奖证书',
    img: {
      src: '/image/honors/2025-engineering-practice-national-special-880.webp',
      srcset: '/image/honors/2025-engineering-practice-national-special-880.webp 880w',
      width: 880,
      height: 627,
      alt: '2025年中国大学生工程实践与创新能力大赛智能救援赛项特等奖证书',
    },
  },
  {
    image: '/image/honors/2025-robot-fighting-national-first.png',
    title: '中国智能机器人格斗及竞技大赛轮式机器人格斗A一等奖',
    meta: '2025年 · 国家级',
    ariaLabel: '查看2025年中国智能机器人格斗及竞技大赛轮式机器人格斗A一等奖证书',
    img: {
      src: '/image/honors/2025-robot-fighting-national-first-1200.webp',
      srcset: '/image/honors/2025-robot-fighting-national-first-1200.webp 1200w, /image/honors/2025-robot-fighting-national-first-1527.webp 1527w',
      width: 1527,
      height: 1079,
      alt: '2025年中国智能机器人格斗及竞技大赛轮式机器人格斗A一等奖证书',
    },
  },
  {
    image: '/image/honors/2025-raicom-ros-national-first.jpg',
    title: '睿抗机器人开发者大赛ROS全国一等奖',
    meta: '2025年 · 国家级',
    img: {
      src: '/image/honors/2025-raicom-ros-national-first-1000.webp',
      srcset: '/image/honors/2025-raicom-ros-national-first-1000.webp 1000w',
      width: 1000,
      height: 707,
      alt: '2025年睿抗机器人开发者大赛RAICOM全国总决赛ROS机器人虚实挑战赛一等奖证书',
    },
  },
  {
    image: '/image/honors/2025-digital-media-national-first.jpg',
    title: '全国大学生数字媒体科技作品及创意竞赛全国一等奖',
    meta: '2025年 · 国家级',
    img: {
      src: '/image/honors/2025-digital-media-national-first-1200.webp',
      srcset: '/image/honors/2025-digital-media-national-first-1200.webp 1200w, /image/honors/2025-digital-media-national-first-1600.webp 1600w, /image/honors/2025-digital-media-national-first-1810.webp 1810w',
      width: 1810,
      height: 1280,
      alt: '2025年全国大学生数字媒体科技作品及创意竞赛全国总决赛一等奖证书',
    },
  },
];
