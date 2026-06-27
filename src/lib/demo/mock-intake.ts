import type { AgentState } from '../contracts.ts'
import { finalizeIntakeFromProfile, type IntakeResult, type RunIntakeOptions } from '../agent/loop.ts'
import type { ActionResult } from '../result.ts'
import { createMinhDemoProfile } from './minh-profile.ts'

export async function runMockDemoIntake(
  state: AgentState,
  options: RunIntakeOptions = {},
): Promise<ActionResult<IntakeResult>> {
  const profile = createMinhDemoProfile()

  return finalizeIntakeFromProfile(
    state,
    profile,
    'Loaded Minh hackathon demo profile',
    'Đã tải hồ sơ demo Minh Nguyễn. Hồ sơ mạnh về kỹ thuật thực hành; phần essay framing và hoạt động cộng đồng cần làm rõ thêm. Bạn có thể xem mức độ phù hợp ngay.',
    'Minh demo: strong hands-on engineering profile with essay framing gaps.',
    options,
  )
}
