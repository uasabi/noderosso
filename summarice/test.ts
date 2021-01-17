import test from 'tape'
import { computeSimilarity, findPeaksAndTroughs, splitByIndexes } from '.'

test('compute rolling cosine', (assert) => {
  const sentences = [
    'I like pears, apples and oranges.',
    'I like apples so much, they are my favourite fruit.',
    `I like eating apples when I'm home.`,

    'I ran yesterday and it was raining.',
  ]

  assert.deepLooseEqual(computeSimilarity(sentences), [
    {
      sentence: 'I like pears, apples and oranges.',
      bagOfWords: { i: 1, like: 1, pear: 1, appl: 1, orang: 1 },
      normalisedScore: 0.27327397015371935,
    },
    {
      sentence: 'I like apples so much, they are my favourite fruit.',
      bagOfWords: { i: 1, like: 1, appl: 1, much: 1, favourit: 1, fruit: 1 },
      normalisedScore: 0.4177007570183191,
    },
    {
      sentence: "I like eating apples when I'm home.",
      bagOfWords: { i: 2, like: 1, eat: 1, appl: 1, home: 1 },
      normalisedScore: 0.35916020204585614,
    },
    {
      sentence: 'I ran yesterday and it was raining.',
      bagOfWords: { i: 1, ran: 1, yesterday: 1, rain: 1 },
      normalisedScore: 0.48077415472493157,
    },
  ])
  assert.end()
})

test('it should find peaks', (asserts) => {
  const array = [102, 112, 115, 120, 119, 102, 101, 100, 103, 105, 110, 109, 105, 100]

  asserts.deepEqual(
    findPeaksAndTroughs(array, (i) => i),
    {
      peaks: [3, 10],
      troughs: [7],
    },
  )
  asserts.end()
})

test('it should group items', (assert) => {
  const sentences = ['a', 'b', 'c', 'd', 'e', 'f']

  assert.deepEqual(splitByIndexes(sentences, [3]), [
    ['a', 'b', 'c', 'd'],
    ['d', 'e', 'f'],
  ])
  assert.deepEqual(splitByIndexes(sentences, [2, 4]), [
    ['a', 'b', 'c'],
    ['c', 'd', 'e'],
    ['e', 'f'],
  ])
  assert.deepEqual(splitByIndexes(sentences, [0, 5]), [['a'], ['a', 'b', 'c', 'd', 'e', 'f'], ['f']])
  assert.end()
})
