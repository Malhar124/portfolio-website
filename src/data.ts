// Every fact about Malhar here comes from the resume; the context around the achievements comes from the events'
// public listings. Edit this file to change site content.

export const profile = {
  name: 'Malhar Udmale',
  fileNo: 'IIB2024020',
  school: 'Indian Institute of Information Technology, Allahabad',
  program: 'B.Tech in Information Technology (Business Informatics)',
  years: '2024 to present',
  cgpa: '7.8',
  interests: [
    'Mechanistic interpretability',
    'AI alignment',
    'AI security',
    'Federated learning',
    'Medical imaging',
    'Low-latency systems',
    'High-performance computing',
  ],
  languages: ['C++', 'C', 'Python', 'Java', 'SQL'],
  skills: {
    'Systems & CS':
      'C++20, data structures & algorithms, concurrency, memory management, memory pools, SPSC queues, cache-aware design, intrusive data structures, operating systems',
    'Deep learning': 'LLMs (Qwen, Gemma), Transformers, CNNs, sparse autoencoders, LoRA, PyTorch',
    'Software & tools': 'CMake, Git, GitHub, FastAPI, React, REST APIs, NumPy, Pandas, Scikit-Learn',
  },
  email: 'iib2024020@iiita.ac.in',
  github: 'https://github.com/Malhar124',
  linkedin: 'https://www.linkedin.com/in/malhar-udmale-a83772324',
  resume: '/resume.pdf',
  // Your photo, 3:4 (the desk frame shows all of it).
  photo: '/photo.jpg',
  // Where you are in the photo, as fractions of its width and height; the artist file's small thumbnail centres on it.
  photoFocus: [0.31, 0.47] as [number, number],
}

export type CoverId = 'awful' | 'starboy' | 'darkage' | 'prom' | 'balloons' | 'thursday' | 'echoes'

export type Album = {
  id: CoverId
  coverTitle: string
  title: string
  meta: string
  after: { artist: string; album: string; year?: number }
  tracks: string[]
  credits?: string
  link?: { label: string; href: string }
  label: string // vinyl centre-label colour
}

export type Drawer = {
  id: 'projects' | 'research' | 'achievements'
  name: string
  blurb: string
  records: Album[]
}

export const drawers: Drawer[] = [
  {
    id: 'projects',
    name: 'Projects',
    blurb: 'A matching engine in C++20 and the equipment desk for the IIIT Allahabad Student Activity Center.',
    records: [
      {
        id: 'awful',
        coverTitle: "IT'S BEEN LOCK-FREE",
        title: 'Low-Latency Stock Exchange Matching Engine',
        meta: 'C++20, CMake, memory pools, SPSC queues, intrusive data structures, cache-aware design',
        after: { artist: 'Isaiah Rashad', album: "IT'S BEEN AWFUL" },
        tracks: [
          'A deterministic, header-only C++20 matching engine with price-time priority across multiple symbols. Supports Limit, Market, IOC, FOK, Stop, Iceberg and Post-only orders.',
          'Cut dynamic allocation on the matching path with intrusive FIFO price levels, fixed-capacity memory pools and pre-allocated event storage.',
          'Lock-free SPSC ring buffers with acquire/release ordering and cache-line-separated cursors. Trivially-copyable events, fixed-point prices, -fno-exceptions.',
        ],
        link: { label: 'View the code', href: 'https://github.com/Malhar124/stock-exchange' },
        label: '#d6351c',
      },
      {
        id: 'starboy',
        coverTitle: 'SACBOY',
        title: 'Smart SAC: Equipment and Room Management Platform',
        meta: 'React, TypeScript, Node.js, Express, PostgreSQL, Prisma, Zod, SSE, Docker',
        after: { artist: 'The Weeknd', album: 'Starboy', year: 2016 },
        tracks: [
          'A full-stack platform for the IIIT Allahabad Student Activity Center: live equipment status, 15-minute reservations, room booking, tickets and chat.',
          'A keyboard-first lend and return desk with barcode and webcam scanning.',
          'PostgreSQL schema with Prisma migrations. Borrowing rules (late returns over 30 days, 7-day blocks, overdue checks) live in a service layer; node-cron jobs send reminders and expire holds.',
        ],
        link: { label: 'View the code', href: 'https://github.com/Malhar124/smart-sac' },
        label: '#f2d31b',
      },
    ],
  },
  {
    id: 'research',
    name: 'Research Experience',
    blurb: 'Two accepted papers: how refusal works outside English, and segmenting bladder tumours without moving patient data.',
    records: [
      {
        id: 'darkage',
        coverTitle: 'LITTLE DARK ABLATION',
        title: 'Refusal Behavior Beyond English: A Multilingual Study of Representation Directions',
        meta: 'Co-author. Epistemic Intelligence in Machine Learning Workshop, ICML 2026. Accepted May 2026.',
        after: { artist: 'MGMT', album: 'Little Dark Age', year: 2018 },
        tracks: [
          'Prior work claims LLM refusal is controlled by one universal direction, but tests it only in English. We tested it on English and 5 Indian languages with Qwen 7B, 14B and 32B.',
          'Built IndicRefuse (6 languages). Ablated a refusal direction per language and scored outputs with a GPT-4o-mini judge.',
          'Ablation removes refusal tokens but yields little harmful compliance in Indic languages (Qwen2-7B Gujarati: refusal 0.34 to 0.02, compliance 0.12). Larger models resist more.',
        ],
        link: { label: 'Read on OpenReview', href: 'https://openreview.net/forum?id=txckkJNTVF' },
        label: '#f4d64e',
      },
      {
        id: 'prom',
        coverTitle: 'ALONE AT EACH SITE',
        title: 'Federated Multi-Task Learning for Bladder Tumor Segmentation and MIBC Classification Using a Hybrid CNN-Transformer Architecture',
        meta: 'Co-first author. International Conference on Computer Vision and Image Processing (CVIP 2026). Accepted 2026.',
        after: { artist: 'Tory Lanez', album: 'Alone at Prom', year: 2021 },
        tracks: [
          'A FedAvg framework (Flower) across 4 clinical centers on FedBCa: 275 T2-weighted MRI scans.',
          'Designed Swin Hybrid: a ResNet-34 + Swin-Tiny encoder with segmentation-guided attention pooling.',
          'Geo + Elastic augmentation gives the best federated result: DSC 0.8100 and patient-level AUC 0.8931, with no patient data shared.',
          'Joint segmentation and MIBC staging in one model: tumour localisation guides the staging decision.',
        ],
        link: { label: 'Conference site', href: 'https://cvip2026.nitc.ac.in/index.html' },
        label: '#f0a48c',
      },
    ],
  },
  {
    id: 'achievements',
    name: 'Achievements',
    blurb: 'Top 8 of 1 lakh+ teams at Adobe, 95.8% in Amazon’s ML Challenge, and runner-up at Sarvam AI.',
    records: [
      {
        id: 'balloons',
        coverTitle: 'HOUSE OF ADOBE',
        title: 'Adobe University Hackathon 2026',
        meta: 'Top 8 of 1 lakh+ teams',
        after: { artist: 'The Weeknd', album: 'House of Balloons', year: 2011 },
        tracks: [
          'Finished in the top 8 out of more than 1 lakh teams.',
          'More and more people ask AI assistants instead of searching, and a website those assistants can’t read well stops being found.',
          'Built a tool that audits a website, ranks what is wrong with it by severity, and flags the issues that hurt its discoverability by AI.',
        ],
        label: '#e4e4e4',
      },
      {
        id: 'thursday',
        coverTitle: 'DEADLINE',
        title: 'Amazon ML Challenge 2026',
        meta: 'Scored 95.8% in a 72-hour ML hackathon',
        after: { artist: 'The Weeknd', album: 'Thursday', year: 2011 },
        tracks: [
          'Amazon’s 72-hour machine learning hackathon for students across India: a real Amazon dataset and a real-world problem, both revealed only on day one.',
          'Every submission is scored on a live leaderboard, with a limited number of tries.',
          'Scored 95.8%, building and tuning the model against the clock.',
        ],
        label: '#ef6a1f',
      },
      {
        id: 'echoes',
        coverTitle: 'ECHOES OF SPEECH',
        title: 'Sarvam AI Campus Hackathon',
        meta: 'Runner-up',
        after: { artist: 'The Weeknd', album: 'Echoes of Silence', year: 2011 },
        tracks: [
          'Runner-up at the campus hackathon run by Sarvam AI, which builds speech and language models for Indian languages.',
          'Built a voice agent for blind people: you speak to it and it speaks back, so nothing depends on seeing a screen.',
          'Multilingual from the start, so it serves people in their own language, not only in English.',
        ],
        label: '#c1121f',
      },
    ],
  },
]

export const allRecords = drawers.flatMap(d => d.records)
