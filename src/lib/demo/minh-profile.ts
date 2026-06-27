import type { Profile } from '../contracts.ts'

/** Demo persona for hackathon — Minh Nguyễn, Grade 12 physics specialist from Hà Nội. */
export function createMinhDemoProfile(): Profile {
  return {
    targetCountry: 'United States',
    targetProgram: 'UC Berkeley · Mechanical Engineering',
    level: 'undergraduate',
    education: 'Lớp 12 · Chuyên Lý · THPT Chuyên Hà Nội · Amsterdam',
    activities: [
      {
        title: 'Mạch cảm biến độ ẩm đất',
        role: 'Builder',
        contribution: 'Thiết kế mạch cảm biến đo độ ẩm đất cho vườn rau của bà',
        impact: 'Giúp bà theo dõi đất khô trong mùa nắng, giảm lãng phí nước tưới',
      },
      {
        title: 'CLB Robotics',
        role: 'Trưởng nhóm lập trình',
        contribution: 'Lập trình điều khiển robot trong 2 năm',
        impact: null,
      },
    ],
    awards: ['Giải nhì HSG Lý cấp tỉnh'],
    workExperience: [],
    motivations: 'Muốn học kỹ thuật để giúp nông nghiệp địa phương và gia đình',
    gapFlags: [
      'Viết tiếng Anh (essay framing)',
      'Hoạt động cộng đồng ngoài CLB',
      'Missing verified English or standardized testing evidence.',
    ],
  }
}

export const MINH_DEMO_INTAKE_LINES = [
  'mình học chuyên Lý, có giải nhì HSG tỉnh. mình làm 1 cái mạch cảm biến đo độ ẩm đất cho vườn rau của bà mình. tiếng anh mình hơi yếu phần viết.',
  'ok. mình cũng tham gia CLB robotics 2 năm, làm trưởng nhóm lập trình.',
] as const
