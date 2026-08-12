// 无线电爱好者协会 - 网站数据

// 竞赛活动
const competitions = [
  {
    id: 'zhanwang-cup-2026',
    name: '展望杯嵌入式大赛',
    year: 2026,
    date: '2026年5月10日',
    participants: null,
    description: '协会年度嵌入式竞赛活动现场记录，展示同学们将创意方案落地为实际作品的过程。',
    tracks: ['嵌入式方向', '软件方向', 'AI方向'],
    highlights: [
      '保留活动现场与作品照片',
      '为后续赛事展示持续补充素材',
    ],
    images: [
      '/image/competitions/zhanwang-cup/photo-05.jpg',
      '/image/competitions/zhanwang-cup/photo-06.jpg',
      '/image/competitions/zhanwang-cup/photo-07.jpg',
    ],
  },
  {
    id: 'electronic-design-2025',
    name: '大学生电子设计大赛',
    year: 2025,
    date: '2025年7月30日',
    participants: 12,
    description: '积极响应国家号召，努力学习专业知识，并运用所学知识能动地改造世界。',
    tracks: ['嵌入式及自动控制赛道', '电子电路设计及应用赛道', '电子设计类开放命题赛道'],
    highlights: [
      '获奖作品将在校园科技展展出',
      '提供专业元器件采购支持',
      '开设赛前技术辅导工作坊',
    ],
    images: [
      '/image/competitions/electronic-design/photo-01.jpg',
      '/image/competitions/electronic-design/photo-02.jpg',
      '/image/competitions/electronic-design/photo-03.jpg',
      '/image/competitions/electronic-design/photo-04.jpg',
    ],
  },
  {
    id: 'fingertip-storm-2023',
    name: '指尖风暴大赛',
    year: 2023,
    date: '2023年11月18日',
    participants: 312,
    description: '为了展现新时代燕大青年锐意进取的创新精神和蓬勃向上的进取意识，进一步丰富同学们的课余生活，增强同学们对C语言、PCB电路绘制的掌握水平和信息素养。',
    tracks: ['软件C语言编程赛道', '硬件EDA设计赛道'],
    highlights: [
      '竞赛规模达300+人次参与',
      '设置专属新生组赛道降低参与门槛',
      '优秀者可加入校科创团队',
    ],
    images: [
      '/image/competitions/fingertip-storm/photo-01.jpg',
      '/image/competitions/fingertip-storm/photo-02.jpg',
      '/image/competitions/fingertip-storm/photo-03.jpg',
      '/image/competitions/fingertip-storm/photo-04.jpg',
    ],
  },
  {
    id: 'diy-2024',
    name: 'DIY达人赛',
    year: 2024,
    date: '2024年12月6日',
    participants: 78,
    description: '贯彻学校创新教育理念，厚植校园科创文化氛围，激发广大同学的专业学习热情与创新创造活力，搭建"以赛促学、以赛促创"的实践展示平台。',
    tracks: ['软件组', '嵌入式组', '视觉识别组'],
    highlights: [
      '软件组：开发创意可视化小游戏',
      '视觉识别：开发程序实现人脸识别、口罩识别、手势识别等',
      '嵌入式方向：基于MCU或开发板的创新电子作品',
    ],
    images: [
      '/image/competitions/diy/photo-01.jpg',
      '/image/competitions/diy/photo-02.jpg',
      '/image/competitions/diy/photo-03.jpg',
      '/image/competitions/diy/photo-04.jpg',
    ],
  },
];

// 文娱活动
const recreationalActivities = [
  {
    name: '欢送师兄师姐晚会',
    date: '2025年6月25日',
    participants: '协会成员及即将毕业学长学姐',
    description: '为感谢即将毕业的学长学姐对协会的贡献，增进协会成员间的感情，举办了此次欢送晚会。活动包含才艺表演、经验分享、互动游戏等环节，为毕业生送上最诚挚的祝福。',
    achievements: '参与成员享受了欢愉的同时也收获了学长学姐的经验',
    images: [
      '/image/activities/farewell/photo-01.jpg',
      '/image/activities/farewell/photo-02.jpg',
      '/image/activities/farewell/photo-03.jpg',
      '/image/activities/farewell/photo-04.jpg',
      '/image/activities/farewell/photo-05.jpg',
    ],
  },
  {
    name: '学长返校与协会成员交流研讨会',
    date: '2024年5月15日',
    participants: '协会骨干成员',
    description: '信息科学与工程学院院长齐跃峰、学院党委副书记李浩然、副处级专职辅导员刘学才、团委书记邹楠一起走访调研燕山大学大学生无线电爱好者协会。',
    achievements: '校园新闻报道1次',
    images: [
      '/image/activities/alumni-visit/photo-01.jpg',
      '/image/activities/alumni-visit/photo-02.jpg',
      '/image/activities/alumni-visit/photo-03.jpg',
      '/image/activities/alumni-visit/photo-04.jpg',
    ],
  },
  {
    name: '协会团建活动',
    date: '2024年10月20日',
    participants: '协会部分成员',
    description: '为增强协会凝聚力，促进新老成员交流，在北戴河鸽子窝公园组织了秋季团建活动。活动包括无线电测向比赛、技术交流沙龙和团队拓展游戏等环节。',
    achievements: '参与成员欢聚，度过美好而又休闲的时光！',
    images: [
      '/image/activities/team-building/photo-01.jpg',
      '/image/activities/team-building/photo-02.jpg',
      '/image/activities/team-building/photo-03.jpg',
    ],
  },
];
