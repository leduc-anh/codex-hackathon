import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detectUserLanguage } from '../../src/lib/language.ts'

test('detects Vietnamese with diacritics', () => {
  assert.equal(detectUserLanguage('Mình muốn học ngành khoa học máy tính.'), 'vi')
})

test('detects unaccented Vietnamese and Vinglish', () => {
  assert.equal(detectUserLanguage('toi muon hoc computer science va can ban giup'), 'vi')
})

test('detects English', () => {
  assert.equal(detectUserLanguage('I want help with my university application.'), 'en')
})

test('keeps the current language for ambiguous input', () => {
  assert.equal(detectUserLanguage('7.5', 'vi'), 'vi')
  assert.equal(detectUserLanguage('Minh', 'en'), 'en')
})
