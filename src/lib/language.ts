export type UserLanguage = 'vi' | 'en'

const VIETNAMESE_DIACRITICS = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i
const VIETNAMESE_WORDS = new Set([
  'anh', 'ban', 'biet', 'cam', 'chao', 'chi', 'cho', 'co', 'cua', 'dang', 'diem',
  'du', 'duoc', 'em', 'giup', 'hoc', 'hoat', 'khong', 'la', 'lop', 'minh', 'mot',
  'muon', 'nganh', 'nhung', 'noi', 'on', 'toi', 'truong', 'va', 've', 'viet', 'voi',
])
const ENGLISH_WORDS = new Set([
  'am', 'and', 'applying', 'application', 'are', 'because', 'club', 'college', 'for',
  'grade', 'hello', 'help', 'i', 'in', 'is', 'me', 'my', 'program', 'project',
  'school', 'study', 'the', 'to', 'university', 'want',
])

/** Detect Vietnamese (including common unaccented/Vinglish input) or English. */
export function detectUserLanguage(
  text: string,
  fallback: UserLanguage = 'en',
): UserLanguage {
  if (VIETNAMESE_DIACRITICS.test(text)) return 'vi'

  const words = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/[a-z]+/g) ?? []
  let vietnameseScore = 0
  let englishScore = 0

  for (const word of words) {
    if (VIETNAMESE_WORDS.has(word)) vietnameseScore += 1
    if (ENGLISH_WORDS.has(word)) englishScore += 1
  }

  if (vietnameseScore >= 2 && vietnameseScore > englishScore) return 'vi'
  if (englishScore > vietnameseScore) return 'en'
  return fallback
}
