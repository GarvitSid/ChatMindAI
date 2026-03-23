export interface Course {
  id: string;
  degree: 'B.Tech' | 'M.Tech';
  title: string;
  department: string;
  duration: string;
  seats: number;
  description: string;
  highlights: string[];
}

export interface PlacementStat {
  label: string;
  value: string;
  detail: string;
}

export interface Recruiter {
  name: string;
  tier: string;
  logoInitial: string;
}

export interface CampusFeature {
  title: string;
  category: string;
  description: string;
  iconName: string;
}

export interface CollegeEvent {
  id: string;
  title: string;
  date: string;
  tag: string;
  description: string;
}

export const COLLEGE_DATA = {
  name: 'ChatMind AI College',
  tagline: 'Empowering Next-Gen Innovators in Artificial Intelligence & Emerging Tech',
  established: 2005,
  campusSize: '25-Acre Smart Eco-Campus',
  location: 'Tech Valley Hub, Innovation District',
  accreditation: 'NAAC A++ Grade & AICTE Approved',
  
  hero: {
    badge: 'Admissions Open for Academic Year 2026-27',
    headline: 'Where Artificial Intelligence Meets World-Class Engineering',
    subheadline:
      'Pioneering experiential education since 2005 on our state-of-the-art 25-acre campus. Explore accredited B.Tech & M.Tech programs with 92% placement track records.',
    stats: [
      { number: '20+', label: 'Years of Excellence' },
      { number: '92%', label: 'Placement Rate' },
      { number: '₹42 LPA', label: 'Highest Package' },
      { number: '150+', label: 'Industry Partners' },
    ],
  },

  about: {
    title: 'About ChatMind AI College',
    subtitle: 'Two Decades of Academic Rigor & Technological Breakthroughs',
    description:
      'Established in 2005, ChatMind AI College spans a verdant 25-acre smart eco-campus designed to nurture visionary engineers, AI researchers, and tech entrepreneurs. Equipped with advanced GPU clusters, robotics labs, and incubation facilities, we bridge the gap between academic theory and real-world industrial impact.',
    pillars: [
      {
        title: '25-Acre Smart Campus',
        desc: 'Fully Wi-Fi enabled sustainable campus with high-speed computing centers and modern student lounges.',
      },
      {
        title: 'Research-First Faculty',
        desc: 'Over 85% of faculty members hold Ph.D.s from premier global institutions and lead cutting-edge R&D projects.',
      },
      {
        title: 'Global Exchange Programs',
        desc: 'Collaborations with top international universities for semester exchange and joint research initiatives.',
      },
      {
        title: 'AI Incubation Cell',
        desc: 'Seed funding, mentorship, and patent filing support for student-founded deep-tech startups.',
      },
    ],
  },

  courses: [
    {
      id: 'btech-cse-ai',
      degree: 'B.Tech',
      title: 'Computer Science & AI Engineering',
      department: 'School of Computing',
      duration: '4 Years (8 Semesters)',
      seats: 180,
      description: 'Comprehensive curriculum covering machine learning, deep learning, LLMs, neural networks, and scalable systems.',
      highlights: ['NVIDIA Jetson Robotics Lab', 'Full-stack MERN & Cloud Systems', 'Capstone AI Industry Project'],
    },
    {
      id: 'btech-data-science',
      degree: 'B.Tech',
      title: 'Data Science & Big Data Analytics',
      department: 'School of Computing',
      duration: '4 Years (8 Semesters)',
      seats: 120,
      description: 'Master big data architectures, distributed computing, predictive modeling, and statistical inference.',
      highlights: ['Apache Spark Cluster Access', 'Financial & Healthcare Data Labs', 'Kaggle Grandmaster Mentorship'],
    },
    {
      id: 'btech-ece-iot',
      degree: 'B.Tech',
      title: 'Electronics & Intelligent IoT Systems',
      department: 'School of Electronics',
      duration: '4 Years (8 Semesters)',
      seats: 120,
      description: 'Hands-on training in embedded systems, edge computing, VLSI design, and autonomous robotics.',
      highlights: ['Texas Instruments IoT Lab', 'FPGA Prototyping Suites', 'Autonomous Drone Test Arena'],
    },
    {
      id: 'mtech-ai-ml',
      degree: 'M.Tech',
      title: 'Artificial Intelligence & Machine Intelligence',
      department: 'Department of Advanced Technologies',
      duration: '2 Years (4 Semesters)',
      seats: 60,
      description: 'Specialized postgraduate research in reinforcement learning, NLP, computer vision, and generative models.',
      highlights: ['High-Performance Supercomputing Node', 'Funded Research Stipends', 'IEEE / ACM Conference Sponsorships'],
    },
    {
      id: 'mtech-cyber-security',
      degree: 'M.Tech',
      title: 'Cybersecurity & Blockchain Engineering',
      department: 'Department of Advanced Technologies',
      duration: '2 Years (4 Semesters)',
      seats: 60,
      description: 'Advanced cryptography, zero-trust network defenses, penetration testing, and decentralized systems.',
      highlights: ['Offensive Security Red-Teaming Lab', 'Smart Contract Auditing Sandbox', 'National Cyber Defense Center Linkage'],
    },
  ] as Course[],

  // Gated Content (Requires Student/Admin Login)
  placements: {
    summary: {
      placementRate: '92%',
      highestPackage: '₹42 LPA',
      averagePackage: '₹14.8 LPA',
      medianPackage: '₹12.2 LPA',
      totalOffers: '680+',
      dreamOffers: '240+ (Above ₹20 LPA)',
    },
    stats: [
      { label: 'Highest Salary Package', value: '₹42.0 LPA', detail: 'Offered by Global Tech Giant (Tier 1)' },
      { label: 'Overall Placement Rate', value: '92.4%', detail: 'Consistently maintained for 5+ years' },
      { label: 'Average CTC', value: '₹14.8 LPA', detail: 'Top 25% cohort average ₹24.2 LPA' },
      { label: 'Total Recruiter Drives', value: '165+ Companies', detail: 'Fortune 500, Unicorns & Global R&D' },
    ] as PlacementStat[],
    topRecruiters: [
      { name: 'Google', tier: 'Tier 1 Global', logoInitial: 'G' },
      { name: 'Microsoft', tier: 'Tier 1 Global', logoInitial: 'MS' },
      { name: 'Amazon AWS', tier: 'Cloud & AI', logoInitial: 'AWS' },
      { name: 'NVIDIA', tier: 'Deep Tech & GPU', logoInitial: 'NV' },
      { name: 'Adobe', tier: 'Software Platform', logoInitial: 'AD' },
      { name: 'Goldman Sachs', tier: 'FinTech & Quant', logoInitial: 'GS' },
      { name: 'Qualcomm', tier: 'Semiconductors', logoInitial: 'QC' },
      { name: 'Cisco', tier: 'Networking & Cyber', logoInitial: 'CS' },
    ] as Recruiter[],
  },

  campusLife: {
    features: [
      {
        title: 'Modern Innovation & Maker Labs',
        category: 'R&D Infrastructure',
        description: '24x7 collaborative workspaces equipped with 3D printers, laser cutters, oscilloscope benches, and server racks.',
        iconName: 'Cpu',
      },
      {
        title: 'Olympic-Standard Sports Complex',
        category: 'Athletics & Health',
        description: 'Indoor badminton stadiums, floodlit football turf, basketball courts, Olympic swimming pool, and gymnasiums.',
        iconName: 'Activity',
      },
      {
        title: 'Smart Central Library & Knowledge Hub',
        category: 'Learning Resources',
        description: 'Over 100,000 physical volumes, access to IEEE/Springer/ACM digital libraries, and private quiet study pods.',
        iconName: 'BookOpen',
      },
      {
        title: 'Vibrant Student Clubs & Hackathons',
        category: 'Campus Culture',
        description: 'Home to 30+ active student societies spanning AI research, competitive programming, music, robotics, and drama.',
        iconName: 'Users',
      },
    ] as CampusFeature[],

    events: [
      {
        id: 'hack-ai-2026',
        title: 'HackMind National AI Hackathon',
        date: 'October 14-16, 2026',
        tag: 'Hackathon',
        description: '48-hour continuous coding sprint featuring ₹5,00,000 cash prizes, venture capital judges, and live mentorship.',
      },
      {
        id: 'tech-symposium',
        title: 'International Emerging Tech Summit',
        date: 'November 20-22, 2026',
        tag: 'Conference',
        description: 'Keynotes from AI industry titans, paper presentations, and interactive workshops on foundational AI.',
      },
      {
        id: 'ignite-fest',
        title: 'Ignite Annual Cultural & Arts Carnival',
        date: 'February 5-7, 2027',
        tag: 'Cultural',
        description: '3-day celebration of music, theatrical arts, fashion shows, and celebrity star night performances.',
      },
    ] as CollegeEvent[],
  },
};
