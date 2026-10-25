// Every fact here comes from the resume. Edit this file to change site content.

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
  // Where you are in the photo, as fractions of its width and height; the small crops (contact sheet, file) centre on it.
  photoFocus: [0.31, 0.47] as [number, number],
}

export type CoverId = 'tickland' | 'sacfm' | 'livelove' | 'atlonglast' | 'wholelotta' | 'dangerous' | 'runnerup'

export type Album = {
  id: CoverId
  coverTitle: string
  title: string
  meta: string
  after: { artist: string; album: string; year: number }
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
        id: 'tickland',
        coverTitle: 'Tick Land',
        title: 'Low-Latency Stock Exchange Matching Engine',
        meta: 'C++20, CMake, memory pools, SPSC queues, intrusive data structures, cache-aware design',
        after: { artist: 'The Weeknd', album: 'Kiss Land', year: 2013 },
        tracks: [
          'A deterministic, header-only C++20 matching engine with price-time priority across multiple symbols. Supports Limit, Market, IOC, FOK, Stop, Iceberg and Post-only orders.',
          'Cut dynamic allocation on the matching path with intrusive FIFO price levels, fixed-capacity memory pools and pre-allocated event storage.',
          'Lock-free SPSC ring buffers with acquire/release ordering and cache-line-separated cursors. Trivially-copyable events, fixed-point prices, -fno-exceptions.',
        ],
        link: { label: 'View the code', href: 'https://github.com/Malhar124/stock-exchange' },
        label: '#39e58c',
      },
      {
        id: 'sacfm',
        coverTitle: 'SAC FM',
        title: 'Smart SAC: Equipment and Room Management Platform',
        meta: 'React, TypeScript, Node.js, Express, PostgreSQL, Prisma, Zod, SSE, Docker',
        after: { artist: 'The Weeknd', album: 'Dawn FM', year: 2022 },
        tracks: [
          'A full-stack platform for the IIIT Allahabad Student Activity Center: live equipment status, 15-minute reservations, room booking, tickets and chat.',
          'A keyboard-first lend and return desk with barcode and webcam scanning.',
          'PostgreSQL schema with Prisma migrations. Borrowing rules (late returns over 30 days, 7-day blocks, overdue checks) live in a service layer; node-cron jobs send reminders and expire holds.',
        ],
        link: { label: 'View the code', href: 'https://github.com/Malhar124/smart-sac' },
        label: '#2f8fbf',
      },
    ],
  },
  {
    id: 'research',
    name: 'Research Experience',
    blurb: 'Two accepted papers: how refusal works outside English, and segmenting bladder tumours without moving patient data.',
    records: [
      {
        id: 'livelove',
        coverTitle: 'LIVE.LOVE.REFUSE',
        title: 'Refusal Behavior Beyond English: A Multilingual Study of Representation Directions',
        meta: 'Co-author. Epistemic Intelligence in Machine Learning Workshop, ICML 2026. Accepted May 2026.',
        after: { artist: 'A$AP Rocky', album: 'LIVE.LOVE.A$AP', year: 2011 },
        tracks: [
          'Prior work claims LLM refusal is controlled by one universal direction, but tests it only in English. We tested it on English and 5 Indian languages with Qwen 7B, 14B and 32B.',
          'Built IndicRefuse (6 languages). Ablated a refusal direction per language and scored outputs with a GPT-4o-mini judge.',
          'Ablation removes refusal tokens but yields little harmful compliance in Indic languages (Qwen2-7B Gujarati: refusal 0.34 to 0.02, compliance 0.12). Larger models resist more.',
        ],
        link: { label: 'Read on OpenReview', href: 'https://openreview.net/forum?id=txckkJNTVF' },
        label: '#ff5ca8',
      },
      {
        id: 'atlonglast',
        coverTitle: 'AT.LONG.LAST.FEDAVG',
        title: 'Federated Multi-Task Learning for Bladder Tumor Segmentation and MIBC Classification Using a Hybrid CNN-Transformer Architecture',
        meta: 'Co-first author. International Conference on Computer Vision and Image Processing (CVIP 2026). Accepted 2026.',
        after: { artist: 'A$AP Rocky', album: 'AT.LONG.LAST.A$AP', year: 2015 },
        tracks: [
          'A FedAvg framework (Flower) across 4 clinical centers on FedBCa: 275 T2-weighted MRI scans.',
          'Designed Swin Hybrid: a ResNet-34 + Swin-Tiny encoder with segmentation-guided attention pooling.',
          'Geo + Elastic augmentation gives the best federated result: DSC 0.8100 and patient-level AUC 0.8931, with no patient data shared.',
          'Joint segmentation and MIBC staging in one model: tumour localisation guides the staging decision.',
        ],
        link: { label: 'Conference site', href: 'https://cvip2026.nitc.ac.in/index.html' },
        label: '#cfcfcf',
      },
    ],
  },
  {
    id: 'achievements',
    name: 'Achievements',
    blurb: 'Three hackathon and challenge results from 2026.',
    records: [
      {
        id: 'wholelotta',
        coverTitle: 'Top 8',
        title: 'Adobe University Hackathon 2026',
        meta: 'Top 8 out of 1 lakh+ teams',
        after: { artist: 'Playboi Carti', album: 'Whole Lotta Red', year: 2020 },
        tracks: ['Built a tool that finds website severities and flags them for AI discoverability.'],
        label: '#d8141c',
      },
      {
        id: 'dangerous',
        coverTitle: 'DANGEROUSLY ACCURATE',
        title: 'Amazon ML Challenge 2026',
        meta: 'Scored 95.8%',
        after: { artist: 'Yeat', album: 'DANGEROUS SUMMER', year: 2025 },
        tracks: ['Scored 95.8% in the Amazon ML Challenge 2026.'],
        label: '#f6d808',
      },
      {
        id: 'runnerup',
        coverTitle: 'RUNNER UP',
        title: 'Sarvam AI Campus Hackathon',
        meta: "Runner's up",
        after: { artist: 'Travis Scott', album: 'Rodeo', year: 2015 },
        tracks: ['Built a multilingual voice agent for blind people.'],
        label: '#d4a73a',
      },
    ],
  },
]

export const allRecords = drawers.flatMap(d => d.records)
