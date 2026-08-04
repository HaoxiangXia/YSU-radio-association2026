// 无线电爱好者协会 - 网站数据

// 统计数据
const stats = [
  { label: '成立年份', value: '1988', suffix: '', icon: 'Calendar' },
  { label: '部门数量', value: '5', suffix: '', icon: 'Radio' },
  { label: '会员人数', value: '200', suffix: '+', icon: 'Users' },
  { label: '累计竞赛获奖', value: '250', suffix: '+', icon: 'Award' },
];

// 最新动态引用的竞赛记录，内容统一从 competitions 读取
const recentCompetitionIds = [
  'zhanwang-cup-2026',
  'electronic-design-2025',
  'diy-2024',
];

// 协会荣誉
const topHonors = [
  {
    title: '河北省高校活力团支部TOP10',
    year: '2022年',
    description: '共青团河北省委颁发，展现了协会在组织建设方面的卓越成就',
    rank: 6,
  },
  {
    title: '燕山大学五星级社团',
    year: '2024年',
    description: '燕山大学学生社团联合会评选，是对协会全年工作的高度认可',
  },
  {
    title: '全国大学生电子设计竞赛河北赛区优秀组织奖',
    year: '2024年',
    description: '全国大学生电子设计竞赛河北赛区组委会颁发，表彰协会在竞赛组织方面的突出贡献',
  },
];

// 部门数据
const departments = [
  {
    name: '组织部',
    category: 'non-technical',
    images: [
      { src: '/image/activities/team-building/photo-02.jpg', alt: '组织部成员交流活动现场' },
      { src: '/image/activities/team-building/photo-01.jpg', alt: '协会成员团建活动合影' },
      { src: '/image/activities/team-building/photo-03.jpg', alt: '协会成员户外活动合影' },
    ],
    description: '组织部是协会的核心协调部门，负责统筹各项活动的策划与执行，是连接各部门的重要纽带。无论是大型竞赛还是日常活动，组织部都在其中发挥着关键的组织协调作用。',
    responsibilities: [
      '策划和组织协会各类活动，包括技术沙龙、竞赛准备、招新活动等',
      '协调各部门之间的工作，确保活动顺利开展',
      '负责协会成员的管理、考勤和档案维护',
      '制定协会规章制度和活动流程',
      '对接学校相关部门，争取资源支持',
      '组织协会内部的交流活动，增强团队凝聚力',
    ],
    features: [
      '锻炼组织协调能力和沟通能力的最佳平台',
      '学习活动策划与执行的全流程管理',
      '与协会所有成员保持密切互动，人脉广泛',
      '有机会成为协会活动的总负责人，提升领导力',
      '掌握项目管理的核心技能，为未来职业发展奠定基础',
    ],
    learn: [
      '公众号运营与新媒体推广技巧',
      '活动策划书与项目计划书撰写',
      '视频剪辑与图片处理（Photoshop、Premiere）',
      '团队管理与协调技巧',
      '文案写作与宣传技巧',
      '会议组织与主持能力',
    ],
    stats: { members: 28, activities: 42, years: 8 },
    statLabel1: '活动场次',
    statLabel2: '成立年限',
    tags: ['统筹协调', '活动策划', '团队管理', '新媒体运营'],
  },
  {
    name: '嵌入式部',
    category: 'technical',
    images: [
      { src: '/image/departments/embedded/project-01.jpg', alt: '嵌入式部制作的无线通信与传感装置' },
      { src: '/image/departments/embedded/project-02.jpg', alt: '嵌入式部制作的智能小车' },
      { src: '/image/departments/embedded/project-03.jpg', alt: '嵌入式部智能小车控制模块' },
      { src: '/image/departments/embedded/project-04.jpg', alt: '嵌入式部传感器与开发板项目' },
    ],
    description: '嵌入式部专注于嵌入式系统开发与应用，是协会的核心技术部门之一，致力于培养成员的软硬件结合能力。部门配备了多种主流开发板和实验设备，为成员提供良好的实践环境。',
    responsibilities: [
      '开展嵌入式技术相关的培训和教学',
      '参与各类电子竞赛的技术准备工作',
      '开发基于嵌入式系统的创新项目',
      '维护协会的电子设备和实验平台',
      '为其他部门提供技术支持',
      '编写技术文档和教程，传承技术经验',
    ],
    features: [
      '理论与实践紧密结合的技术部门',
      '参与实际项目开发，积累实战经验',
      '有机会参加国家级电子竞赛并获得奖项',
      '软硬件兼修，全面发展技术能力',
      '部门内部定期举办技术分享会，共同进步',
    ],
    learn: [
      'STM32、Arduino、ESP32等主流开发平台',
      'C/C++嵌入式编程与调试技巧',
      '传感器应用与数据采集技术',
      '嵌入式操作系统（FreeRTOS、uC/OS）原理',
      'PCB设计与制作（Altium Designer、KiCad）',
      '物联网（IoT）技术与应用开发',
    ],
    stats: { members: 35, projects: 26, awards: 18 },
    statLabel1: '完成项目',
    statLabel2: '竞赛奖项',
    tags: ['STM32', 'Arduino', '硬件开发', '竞赛强队'],
  },
  {
    name: '机械部',
    category: 'technical',
    images: [
      { src: '/image/departments/mechanical/project-01.jpg', alt: '机械部制作的机器人结构装置' },
      { src: '/image/departments/mechanical/project-02.jpg', alt: '机械部制作的三维打印龙模型' },
      { src: '/image/departments/mechanical/project-03.jpg', alt: '机械部制作的金属打印龙模型' },
      { src: '/image/departments/mechanical/project-04.jpg', alt: '机械部制作的三维打印飞鸟模型' },
    ],
    description: '机械部专注于机械设计与制造，为协会的各类项目提供结构设计支持，是技术实现的重要保障。部门拥有3D打印机等先进设备，能够将设计理念快速转化为实物模型。',
    responsibilities: [
      '负责各类竞赛和项目的机械结构设计',
      '开展机械设计软件的教学与培训',
      '进行3D建模与打印工作',
      '参与机械零件的加工与装配',
      '与嵌入式部合作完成整体项目',
      '优化现有结构设计，提高性能和可靠性',
    ],
    features: [
      '注重空间想象能力和动手能力的培养',
      '拥有3D打印等先进设备，实践机会丰富',
      '设计成果可直接转化为实物，成就感强',
      '与其他技术部门紧密协作，共同完成复杂项目',
      '参与从设计到制造的全流程，经验全面',
    ],
    learn: [
      'SolidWorks、AutoCAD等专业设计软件',
      '机械制图与工程绘图规范',
      '3D建模与打印技术及参数优化',
      '机械结构设计原理与材料选择',
      '材料力学与结构强度分析',
      '产品原型制作与测试方法',
    ],
    stats: { members: 22, models: 53, printers: 3 },
    statLabel1: '3D模型',
    statLabel2: '3D打印机',
    tags: ['3D打印', 'SolidWorks', '结构设计', '动手实践'],
  },
  {
    name: '计算机部',
    category: 'technical',
    images: [
      { src: '/image/competitions/misc/programming-contest.jpg', alt: '计算机部成员参加大学生程序设计竞赛' },
      { src: '/image/competitions/misc/maker-contest.jpg', alt: '计算机部成员参加大学生创新创业竞赛' },
    ],
    description: '计算机部专注于软件与算法开发，为协会提供软件开发和信息技术支持，推动智能化技术应用。部门成员参与从算法设计到应用开发的全流程工作，技术覆盖面广。',
    responsibilities: [
      '开发各类应用程序和控制系统',
      '研究和实现智能算法',
      '维护协会网站和信息系统',
      '开展计算机相关技术培训',
      '为其他部门提供软件开发支持',
      '探索新技术在协会项目中的应用',
    ],
    features: [
      '技术覆盖面广，学习内容丰富多样',
      '注重编程能力和算法思维培养',
      '有机会参与开源项目，积累实战经验',
      '与前沿技术接轨，学习最新开发框架',
      '开发成果直接应用于协会各类活动',
    ],
    learn: [
      'Python、C++、JavaScript等多编程语言',
      'Web开发（前端/后端）与数据库应用',
      'Linux操作系统应用与Shell编程',
      '人工智能与机器学习基础算法',
      '物理引擎与仿真技术应用',
      '移动应用开发与界面设计',
      'ACM算法竞赛',
    ],
    stats: { members: 30, softwares: 19, websites: 2 },
    statLabel1: '开发软件',
    statLabel2: '搭建网站',
    tags: ['编程开发', '算法研究', 'Web技术', 'AI应用'],
  },
  {
    name: '团支部',
    category: 'non-technical',
    images: [
      { src: '/image/activities/youth-league/photo-02.jpg', alt: '无线电爱好者协会团支部主题学习海报' },
      { src: '/image/activities/youth-league/photo-01.jpg', alt: '团支部成员开展主题学习活动' },
      { src: '/image/activities/team-building/photo-01.jpg', alt: '协会成员参与集体活动' },
    ],
    description: '团支部是协会的思想引领核心，负责协会的思想政治工作和团员管理，促进协会健康发展。同时也承担着协会文化建设和对外宣传的重要职责。',
    responsibilities: [
      '组织开展主题团日活动和政治学习',
      '负责团员的发展、教育和管理工作',
      '组织召开团代会和组织生活会',
      '推动协会文化建设和精神文明建设',
      '配合学校团委完成相关工作',
      '宣传协会活动和成果，提升协会影响力',
    ],
    features: [
      '锻炼组织领导和思想引领能力',
      '参与协会重大决策讨论，发挥核心作用',
      '培养团队协作和沟通能力',
      '有机会获得优秀团员等荣誉称号',
      '与学校各级团组织保持密切联系',
    ],
    learn: [
      '团组织工作方法与技巧',
      '思想政治教育理论与实践',
      '公文写作与会议组织规范',
      '团队管理与激励机制',
      '活动策划与执行流程',
      '新闻写作与宣传报道技巧',
    ],
    stats: { members: 33, events: 35, honors: 9 },
    statLabel1: '主题活动',
    statLabel2: '获得荣誉',
    tags: ['思想引领', '组织建设', '文化宣传', '志愿服务'],
  },
];

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
