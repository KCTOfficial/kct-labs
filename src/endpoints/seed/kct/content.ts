/**
 * Initial KCT Hub content (EN + ID). Facts (names, package IDs, categories, download labels) come from
 * the KCT developer page on Google Play; descriptions/features are draft copy to be reviewed by KCT.
 */
export type Localized<T = string> = { en: T; id: T }

export type SeedCategory = { slug: string; title: Localized; sortOrder: number }

export type SeedApp = {
  slug: string
  packageId: string
  name: string
  category: string
  downloadsLabel?: string
  ageRating?: string
  featured?: boolean
  sortOrder: number
  tagline: Localized
  shortDescription: Localized
  description: Localized
  features: Localized<string[]>
}

export const seedCategories: SeedCategory[] = [
  { slug: 'productivity', title: { en: 'Productivity', id: 'Produktivitas' }, sortOrder: 1 },
  { slug: 'education', title: { en: 'Education', id: 'Pendidikan' }, sortOrder: 2 },
  {
    slug: 'educational-games',
    title: { en: 'Educational Games', id: 'Game Edukasi' },
    sortOrder: 3,
  },
  { slug: 'finance', title: { en: 'Finance', id: 'Keuangan' }, sortOrder: 4 },
  {
    slug: 'books-reference',
    title: { en: 'Books & Reference', id: 'Buku & Referensi' },
    sortOrder: 5,
  },
  { slug: 'business-tools', title: { en: 'Business Tools', id: 'Alat Bisnis' }, sortOrder: 6 },
]

export const seedApps: SeedApp[] = [
  {
    slug: 'al-quran-imam',
    packageId: 'com.kct.quranx',
    name: 'Al Quran Imam',
    category: 'books-reference',
    downloadsLabel: '100+',
    ageRating: '3+',
    featured: true,
    sortOrder: 1,
    tagline: {
      en: 'The Qur’an with colour themes, Waqf & Ibtida markers and Murojaah mode.',
      id: 'Al-Qur’an dengan tema berwarna, Waqaf Ibtida, dan mode Murojaah.',
    },
    shortDescription: {
      en: 'The Qur’an with colour themes, Waqf & Ibtida markers and a Murojaah mode for memorisation.',
      id: 'Al-Qur’an dengan tema berwarna, Waqaf Ibtida, dan mode Murojaah untuk hafalan.',
    },
    description: {
      en: 'Al-Qur’an Imam helps you read, understand and memorise the Qur’an with colour-coded text, Waqf & Ibtida markers, and a Murojaah mode for structured memorisation review.',
      id: 'Al-Qur’an Imam membantu Anda membaca, memahami, dan menghafal Al-Qur’an dengan tampilan berwarna, penanda Waqaf & Ibtida, serta mode Murojaah untuk mengulang hafalan secara terstruktur.',
    },
    features: {
      en: [
        'Colour themes for tajweed',
        'Waqf & Ibtida markers',
        'Murojaah mode for memorisation',
        'Fast surah & juz navigation',
      ],
      id: [
        'Tema berwarna untuk tajwid',
        'Penanda Waqaf & Ibtida',
        'Mode Murojaah untuk hafalan',
        'Navigasi surah & juz yang cepat',
      ],
    },
  },
  {
    slug: 'aksarago',
    packageId: 'co.id.kct.games.aksarago',
    name: 'AksaraGo',
    category: 'educational-games',
    sortOrder: 2,
    tagline: {
      en: 'Learn numeracy, literacy and Javanese script through fun games.',
      id: 'Belajar numerasi, literasi & aksara Jawa lewat game seru.',
    },
    shortDescription: {
      en: 'Learn numeracy, literacy and Javanese script through fun games for K-12 students.',
      id: 'Belajar numerasi, literasi, dan aksara Jawa lewat game seru untuk SD–SMA.',
    },
    description: {
      en: 'AksaraGo turns numeracy, literacy and Javanese script practice into fun games for elementary to high-school students.',
      id: 'AksaraGo mengubah latihan numerasi, literasi, dan aksara Jawa menjadi permainan seru untuk pelajar SD hingga SMA.',
    },
    features: {
      en: ['Numeracy games', 'Literacy games', 'Javanese script practice'],
      id: ['Game numerasi', 'Game literasi', 'Latihan aksara Jawa'],
    },
  },
  {
    slug: 'ingetin-jadwal',
    packageId: 'id.ingetin.jadwal',
    name: 'Ingetin Jadwal',
    category: 'education',
    sortOrder: 3,
    tagline: {
      en: 'Class schedules, assignments and reminders for students.',
      id: 'Jadwal pelajaran, tugas, dan pengingat kelas untuk pelajar.',
    },
    shortDescription: {
      en: 'Class schedules, assignments and reminders for students up to university.',
      id: 'Jadwal pelajaran, tugas, dan pengingat kelas untuk pelajar hingga mahasiswa.',
    },
    description: {
      en: 'Ingetin Jadwal keeps class schedules, assignments and reminders in one place for students from elementary school to university.',
      id: 'Ingetin Jadwal menyimpan jadwal pelajaran, tugas, dan pengingat kelas dalam satu tempat untuk pelajar SD sampai mahasiswa.',
    },
    features: {
      en: ['Class schedules', 'Assignment tracking', 'Class reminders'],
      id: ['Jadwal pelajaran', 'Pencatatan tugas', 'Pengingat kelas'],
    },
  },
  {
    slug: 'jejak-uang',
    packageId: 'id.jejakuang.app',
    name: 'Jejak Uang',
    category: 'finance',
    downloadsLabel: '10+',
    sortOrder: 4,
    tagline: {
      en: 'Track income and expenses with ease.',
      id: 'Catat pemasukan dan pengeluaran dengan mudah.',
    },
    shortDescription: {
      en: 'Track income and expenses and understand where your money goes.',
      id: 'Catat pemasukan dan pengeluaran, pahami ke mana uangmu pergi.',
    },
    description: {
      en: 'Jejak Uang makes it easy to record income and expenses so you understand where your money goes.',
      id: 'Jejak Uang memudahkan Anda mencatat pemasukan dan pengeluaran sehingga Anda paham ke mana uang Anda pergi.',
    },
    features: {
      en: ['Record income', 'Record expenses', 'See where your money goes'],
      id: ['Catat pemasukan', 'Catat pengeluaran', 'Pahami ke mana uang pergi'],
    },
  },
  {
    slug: 'koorva-work',
    packageId: 'com.kwork.mobile',
    name: 'Koorva Work',
    category: 'business-tools',
    downloadsLabel: '10+',
    featured: true,
    sortOrder: 5,
    tagline: {
      en: 'Modernise your business workflows and integrate your systems.',
      id: 'Modernkan alur kerja bisnis Anda & integrasikan sistem Anda.',
    },
    shortDescription: {
      en: 'Modernise business workflows and integrate company systems.',
      id: 'Modernkan alur kerja bisnis dan integrasikan sistem perusahaan.',
    },
    description: {
      en: 'Koorva Work helps companies modernise business workflows and integrate the systems they already use.',
      id: 'Koorva Work membantu perusahaan memodernkan alur kerja bisnis dan mengintegrasikan sistem yang sudah digunakan.',
    },
    features: {
      en: ['Digital workflows', 'System integration'],
      id: ['Alur kerja terdigitalisasi', 'Integrasi sistem'],
    },
  },
  {
    slug: 'koorva-task',
    packageId: 'com.ktask.mobile',
    name: 'Koorva Task',
    category: 'productivity',
    downloadsLabel: '5+',
    sortOrder: 6,
    tagline: {
      en: 'Collaboration tools that help companies manage team tasks.',
      id: 'Alat kolaborasi untuk membantu perusahaan mengelola tugas tim.',
    },
    shortDescription: {
      en: 'Collaborate on team tasks and company projects in one place.',
      id: 'Kolaborasi tugas tim dan proyek perusahaan dalam satu tempat.',
    },
    description: {
      en: 'Koorva Task gives companies collaboration tools to manage team tasks and projects in one place.',
      id: 'Koorva Task memberi perusahaan alat kolaborasi untuk mengelola tugas dan proyek tim dalam satu tempat.',
    },
    features: {
      en: ['Team task management', 'Project collaboration'],
      id: ['Manajemen tugas tim', 'Kolaborasi proyek'],
    },
  },
  {
    slug: 'e-absen',
    packageId: 'co.id.kct.niabsen',
    name: 'E-absen',
    category: 'productivity',
    downloadsLabel: '1+',
    sortOrder: 7,
    tagline: {
      en: 'Android-based attendance app.',
      id: 'Aplikasi absensi berbasis Android.',
    },
    shortDescription: {
      en: 'Simple, accurate employee attendance on Android.',
      id: 'Absensi karyawan berbasis Android yang ringkas dan akurat.',
    },
    description: {
      en: 'E-absen is an Android-based attendance app for recording employee attendance.',
      id: 'E-absen adalah aplikasi absensi berbasis Android untuk mencatat kehadiran karyawan.',
    },
    features: {
      en: ['Employee attendance', 'Android-based'],
      id: ['Absensi karyawan', 'Berbasis Android'],
    },
  },
]

type IconItem = { icon: string; title: Localized; description: Localized }

export const homeContent = {
  hero: {
    badge: { en: '7 APPS AVAILABLE ON GOOGLE PLAY', id: '7 APLIKASI TERSEDIA DI GOOGLE PLAY' },
    headline: {
      en: 'Apps built by KCT for your everyday life and business.',
      id: 'Aplikasi buatan KCT untuk keseharian dan bisnis Anda.',
    },
    subheadline: {
      en: 'A collection of apps designed and developed by PT Kreasindo Cipta Teknologi — from daily worship, learning and personal finance to tools for teams.',
      id: 'Kumpulan aplikasi yang dirancang dan dikembangkan oleh PT Kreasindo Cipta Teknologi — mulai dari ibadah harian, belajar, keuangan pribadi, hingga alat kerja tim.',
    },
    primaryCtaLabel: { en: 'Explore Apps', id: 'Jelajahi Aplikasi' },
    secondaryCtaLabel: { en: 'View on Google Play', id: 'Lihat di Google Play' },
    showcase: ['al-quran-imam', 'koorva-work', 'jejak-uang'],
  },
  catalog: {
    eyebrow: { en: 'OUR APPS', id: 'APLIKASI KAMI' },
    title: { en: 'Explore apps from KCT.', id: 'Jelajahi aplikasi dari KCT.' },
    subtitle: {
      en: 'Every app is built by the KCT team and is available to download on Google Play.',
      id: 'Setiap aplikasi dikembangkan oleh tim KCT dan sudah tersedia untuk diunduh di Google Play.',
    },
    serviceCard: {
      badge: { en: 'DEVELOPMENT SERVICES', id: 'LAYANAN PENGEMBANGAN' },
      title: { en: 'Need an app for your business?', id: 'Butuh aplikasi untuk bisnis Anda?' },
      body: {
        en: 'Tell us what your business needs and the KCT team will design the app.',
        id: 'Ceritakan kebutuhan bisnis Anda, tim KCT siap merancang aplikasinya.',
      },
      ctaLabel: { en: 'Discuss Your Idea', id: 'Diskusikan Ide' },
    },
  },
  featured: {
    eyebrow: { en: 'FEATURED', id: 'SOROTAN' },
    title: {
      en: 'Koorva: an integrated workspace for modern teams.',
      id: 'Koorva: ruang kerja terintegrasi untuk tim modern.',
    },
    description: {
      en: 'Integrated, Customizable & Empowering. Koorva Work and Koorva Task help companies manage workflows, tasks and team collaboration in one ecosystem.',
      id: 'Integrated, Customizable & Empowering. Koorva Work dan Koorva Task membantu perusahaan mengelola alur kerja, tugas, dan kolaborasi tim dari satu ekosistem.',
    },
    visualLabel: { en: 'KOORVA SUITE', id: 'KOORVA SUITE' },
    ctaLabel: { en: 'Koorva Work Details', id: 'Detail Koorva Work' },
    features: [
      {
        icon: 'workflow',
        title: { en: 'Digital workflows', id: 'Alur kerja terdigitalisasi' },
        description: {
          en: 'Approvals, requests and business processes run paperless.',
          id: 'Persetujuan, permintaan, dan proses bisnis berjalan tanpa kertas.',
        },
      },
      {
        icon: 'list-checks',
        title: { en: 'Team task management', id: 'Manajemen tugas tim' },
        description: {
          en: "Track project progress and each member's responsibilities.",
          id: 'Pantau progres proyek dan tanggung jawab setiap anggota.',
        },
      },
      {
        icon: 'plug-zap',
        title: { en: 'System integration', id: 'Integrasi sistem' },
        description: {
          en: 'Connect Koorva with the systems your company already uses.',
          id: 'Hubungkan Koorva dengan sistem yang sudah dipakai perusahaan.',
        },
      },
    ] as IconItem[],
  },
  process: {
    eyebrow: { en: 'HOW WE WORK', id: 'CARA KAMI BEKERJA' },
    title: {
      en: 'From idea to release on Play Store.',
      id: 'Dari ide hingga rilis di Play Store.',
    },
    subtitle: {
      en: 'Every KCT app goes through the same process to keep quality consistent.',
      id: 'Setiap aplikasi KCT melalui proses yang sama agar kualitasnya terjaga.',
    },
    steps: [
      {
        icon: 'search',
        title: { en: 'Research', id: 'Riset' },
        description: {
          en: 'Understand user needs and business processes.',
          id: 'Memahami kebutuhan pengguna dan proses bisnis.',
        },
      },
      {
        icon: 'pen-tool',
        title: { en: 'Prototype', id: 'Prototipe' },
        description: {
          en: 'Design flows & interfaces, validated early.',
          id: 'Merancang alur & antarmuka, divalidasi lebih awal.',
        },
      },
      {
        icon: 'shield-check',
        title: { en: 'Testing', id: 'Pengujian' },
        description: {
          en: 'QA, performance tests and trials with users.',
          id: 'QA, uji performa, dan uji coba bersama pengguna.',
        },
      },
      {
        icon: 'rocket',
        title: { en: 'Release', id: 'Rilis' },
        description: {
          en: 'Published on Google Play and continuously improved.',
          id: 'Terbit di Google Play, lalu terus ditingkatkan.',
        },
      },
    ] as IconItem[],
  },
  about: {
    eyebrow: { en: 'ABOUT US', id: 'TENTANG KAMI' },
    title: {
      en: 'Built by PT Kreasindo Cipta Teknologi.',
      id: 'Dibangun oleh PT Kreasindo Cipta Teknologi.',
    },
    body: {
      en: 'KCT is an IT consultancy focused on software solutions, mobile development and IoT. Our vision is to grow consistently and become a Leading Performer as an IT consultant.',
      id: 'KCT adalah konsultan TI yang berfokus pada pengembangan solusi perangkat lunak, aplikasi mobile, dan IoT. Visi kami: terus berkembang secara konsisten hingga menjadi Leading Performer sebagai konsultan TI.',
    },
    linkLabel: { en: 'Visit kct.co.id', id: 'Kunjungi kct.co.id' },
    services: [
      {
        icon: 'code',
        title: { en: 'Software Development', id: 'Software Development' },
        description: {
          en: 'Systems and web apps tailored to your business processes.',
          id: 'Sistem dan aplikasi web yang disesuaikan dengan proses bisnis.',
        },
      },
      {
        icon: 'smartphone',
        title: { en: 'Mobile Development', id: 'Mobile Development' },
        description: {
          en: 'Android apps for handheld devices, ready for Play Store.',
          id: 'Aplikasi Android untuk perangkat genggam, siap rilis di Play Store.',
        },
      },
      {
        icon: 'cpu',
        title: { en: 'Internet of Things', id: 'Internet of Things' },
        description: {
          en: 'Device and sensor integration for operational automation.',
          id: 'Integrasi perangkat dan sensor untuk otomasi operasional.',
        },
      },
      {
        icon: 'boxes',
        title: { en: 'Odoo ERP', id: 'Odoo ERP' },
        description: {
          en: 'ERP implementation and customisation for company operations.',
          id: 'Implementasi dan kustomisasi ERP untuk operasional perusahaan.',
        },
      },
    ] as IconItem[],
  },
  cta: {
    kicker: { en: '// START YOUR PROJECT', id: '// MULAI PROYEK ANDA' },
    title: {
      en: "Have an app idea? Let's build it with the KCT team.",
      id: 'Punya ide aplikasi? Mari rakit bersama tim KCT.',
    },
    body: {
      en: 'A free consultation to map your needs and project scope.',
      id: 'Konsultasi gratis untuk memetakan kebutuhan dan ruang lingkup proyek Anda.',
    },
    whatsappLabel: { en: 'Chat via WhatsApp', id: 'Chat via WhatsApp' },
  },
  meta: {
    title: {
      en: 'KCT Hub — Apps by PT Kreasindo Cipta Teknologi',
      id: 'KCT Hub — Aplikasi dari PT Kreasindo Cipta Teknologi',
    },
    description: {
      en: 'Explore apps by PT Kreasindo Cipta Teknologi (KCT) for worship, learning, finance and teamwork — available on Google Play.',
      id: 'Jelajahi aplikasi dari PT Kreasindo Cipta Teknologi (KCT) untuk ibadah, belajar, keuangan, dan kerja tim — tersedia di Google Play.',
    },
  },
}

export const contact = {
  email: 'team@kct.co.id',
  whatsapp: '081223344939',
  phone: '021 2922 2999',
  address: { en: 'South Jakarta, Indonesia', id: 'Jakarta Selatan, Indonesia' },
}

export const navItems: Array<{ url: string; label: Localized }> = [
  { url: '/apps', label: { en: 'Apps', id: 'Aplikasi' } },
  { url: '/#about', label: { en: 'About', id: 'Tentang' } },
  { url: '/#services', label: { en: 'Services', id: 'Layanan' } },
  { url: '/#contact', label: { en: 'Contact', id: 'Kontak' } },
]

export const footerColumns: Array<{
  title: Localized
  links: Array<{ url: string; label: Localized }>
}> = [
  {
    title: { en: 'Apps', id: 'Aplikasi' },
    links: [
      { url: '/apps', label: { en: 'All Apps', id: 'Semua Aplikasi' } },
      { url: '/apps?category=productivity', label: { en: 'Productivity', id: 'Produktivitas' } },
      { url: '/apps?category=education', label: { en: 'Education', id: 'Pendidikan' } },
      { url: '/apps?category=finance', label: { en: 'Finance', id: 'Keuangan' } },
    ],
  },
  {
    title: { en: 'Company', id: 'Perusahaan' },
    links: [
      { url: '/#about', label: { en: 'About KCT', id: 'Tentang KCT' } },
      { url: '/#services', label: { en: 'Services', id: 'Layanan' } },
      { url: 'https://www.kct.co.id', label: { en: 'kct.co.id ↗', id: 'kct.co.id ↗' } },
    ],
  },
]

export const footerTagline: Localized = {
  en: 'Entertain Your Business with Technology. KCT Hub showcases apps designed and developed by PT Kreasindo Cipta Teknologi.',
  id: 'Entertain Your Business with Technology. KCT Hub menampilkan aplikasi yang dirancang dan dikembangkan oleh PT Kreasindo Cipta Teknologi.',
}
