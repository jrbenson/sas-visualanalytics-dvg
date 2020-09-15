import { Data } from '../src/data'

const cols1 = ['ColumnStr', 'ColumnInt', 'ColumnFloat']
const data1 = [
  ['Alpha', 1, 2.8],
  ['Beta', 3, 4.4],
  ['Gamma', 6, 8.3],
]

test('basic', () => {
  let d = new Data(data1, cols1)
  expect(d.get(0, 'ColumnStr')).toBe('Alpha')
})
