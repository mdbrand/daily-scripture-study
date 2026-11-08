import type { AnswerEmail, DailyStudy } from './templates';

// Test content. NIV wording throughout.
export const sampleFreeStudy: DailyStudy = {
  isTest: true,
  dateLabel: 'Sunday, November 8, 2026',
  subject: 'Be still: what it meant the first time (Psalm 46)',
  pillar: 'Perseverance, peace, and trust',
  title: '“Be still” was first a command to stop fighting',
  passage: {
    text: 'He says, ‘Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.’',
    ref: 'Psalm 46:10 (NIV)',
  },
  intro:
    'Most of us read “be still” as an invitation to quiet time. That meaning is real, but in its first setting the words land somewhere surprising: in the middle of a war.',
  behind: [
    'Psalm 46 is labeled “Of the Sons of Korah.” They were a family of Levites who served as singers and musicians at the temple. The psalm opens with the whole world shaking: the earth gives way, mountains fall into the sea, and nations are in uproar (verses 2–6). Through all of it, God’s city stands.',
    'The Hebrew word behind “be still” (rāphāh) means to let go, loosen your grip, or stop. In verse 10, God is speaking to the warring nations of the verses just before it. In plain words: put down your weapons, and recognize who is God.',
    'The psalm does not say when it was written. Many readers have connected it to 701 BC, when the Assyrian army surrounded Jerusalem and then withdrew without taking the city (2 Kings 18–19). That connection is a reasonable guess, not something the text states.',
  ],
  detail:
    'Look at the verse right before “be still.” Verse 9 says God “breaks the bow and shatters the spear; he burns the shields with fire.” The call to be still comes after God has already ended the fight.',
  voices: [
    {
      name: 'Martin Luther',
      dates: '1483–1546',
      kind: 'Thematic connection',
      body:
        'The German Reformer wrote the hymn “A Mighty Fortress Is Our God” (in German, “Ein feste Burg ist unser Gott”) as a loose paraphrase of Psalm 46, sometime between 1527 and 1529. It became one of the best-known hymns of the Reformation, and it is still sung today in many churches. It is a hymn based on this psalm, not a verse-by-verse commentary on it.',
      source: 'Martin Luther, “Ein feste Burg ist unser Gott,” written c. 1527–1529',
    },
  ],
  readMore: [
    { label: 'Read all of Psalm 46 (NIV)', url: 'https://www.biblegateway.com/passage/?search=Psalm%2046&version=NIV' },
    { label: 'The siege of Jerusalem in 701 BC: 2 Kings 18–19 (NIV)', url: 'https://www.biblegateway.com/passage/?search=2%20Kings%2018-19&version=NIV' },
    { label: 'Martin Luther’s hymn “A Mighty Fortress Is Our God”' },
  ],
};

export const sampleAnswer: AnswerEmail = {
  isTest: true,
  subject: 'You asked: Why did God harden Pharaoh’s heart?',
  question: 'Why did God harden Pharaoh’s heart? Isn’t that unfair?',
  shortAnswer:
    'Exodus describes it three ways: Pharaoh hardened his own heart, his heart “became hard,” and God hardened it. Most Christian readers see God confirming a choice Pharaoh kept making, while some traditions put more weight on God’s sovereign purpose. All agree the story never shows an innocent man forced into evil.',
  sections: [
    {
      heading: 'What the text actually says',
      passages: [
        { text: 'But when Pharaoh saw that there was relief, he hardened his heart and would not listen to Moses and Aaron, just as the LORD had said.', ref: 'Exodus 8:15 (NIV)' },
        { text: 'But the LORD hardened Pharaoh’s heart and he would not listen to Moses and Aaron, just as the LORD had said to Moses.', ref: 'Exodus 9:12 (NIV)' },
      ],
      paragraphs: [
        'During the first five plagues, the story says Pharaoh hardened his own heart, or that his heart “became hard.” Not until the sixth plague, the boils (Exodus 9:12), does the narrator say the LORD hardened it. Even after that, Pharaoh is again said to harden his own heart (Exodus 9:34).',
        'It also helps to remember where the story starts. Before any of this, Pharaoh had enslaved Israel and ordered Hebrew baby boys thrown into the Nile (Exodus 1:22). He was not a neutral man who got pushed.',
      ],
    },
    {
      heading: 'How Christians have read it',
      passages: [{ text: 'Therefore God has mercy on whom he wants to have mercy, and he hardens whom he wants to harden.', ref: 'Romans 9:18 (NIV)' }],
      paragraphs: [
        'Confirming a choice. Many readers, across Catholic, Orthodox, and Protestant traditions, see God giving Pharaoh over to what he had already chosen again and again. Paul describes something similar in Romans 1:24, where God “gave them over” to the desires of their hearts.',
        'God’s sovereign purpose. Reformed (Calvinist) readers stress that Paul uses Pharaoh in Romans 9:17–18 to show that God is free to show mercy and to harden. On this view, God’s purposes are just even when we cannot fully see how.',
        'Strengthening his resolve. The Hebrew word used most often, ḥāzaq, means “to make strong.” Some readers take it to mean God strengthened Pharaoh’s will so he acted on what he truly wanted, instead of giving in only to make the plagues stop.',
        'These views overlap more than they compete. The stated purpose in Exodus is that Egypt and Israel would know who the LORD is (Exodus 7:5; 9:16), and the story ends in rescue for an enslaved people.',
      ],
    },
  ],
  voices: [
    {
      name: 'Origen of Alexandria',
      dates: 'c. 184–c. 253',
      kind: 'Direct commentary',
      body:
        'Origen, an early Christian teacher in Egypt, wrote about Pharaoh’s heart at length. He compared God’s action to the sun: the same heat melts wax and hardens clay. God’s patience and signs were the same; what differed was the heart receiving them.',
      source: 'Origen, On First Principles (De Principiis), Book 3, chapter 1',
    },
  ],
  readMore: [
    { label: 'The plagues and Pharaoh’s heart: Exodus 7–11 (NIV)', url: 'https://www.biblegateway.com/passage/?search=Exodus%207-11&version=NIV' },
    { label: 'Paul’s use of the story: Romans 9:14–24 (NIV)', url: 'https://www.biblegateway.com/passage/?search=Romans%209%3A14-24&version=NIV' },
    { label: 'Origen, On First Principles, Book 3' },
  ],
};

// First real reply-with-a-question test (Rob, Nov 8 2026, replying to the Psalm 46 study).
export const answerPsalm46War: AnswerEmail = {
  isTest: true,
  subject: 'Re: [TEST] Be still: what it meant the first time (Psalm 46)',
  question: 'What war was it, who were the major players, and why did the author write Psalm 46?',
  shortAnswer:
    'The psalm never names a war. The most likely setting is 701 BC, when the Assyrian king Sennacherib invaded Judah and surrounded Jerusalem, and King Hezekiah, with the prophet Isaiah, refused to surrender. The Assyrians left without taking the city. The psalm was written as a temple song so God’s people would sing, in any crisis, that God is with them.',
  sections: [
    {
      heading: 'The war most people connect it to',
      paragraphs: [
        'In 701 BC, Assyria was the superpower of the world. Its king, Sennacherib, marched west to crush kingdoms that had stopped paying him tribute, including Judah. He captured Judah’s fortified towns, including Lachish, its second most important city (2 Kings 18:13–14).',
        'Then his army surrounded Jerusalem. His field commander stood outside the walls and shouted to the people, in their own language, that no god had ever saved a nation from Assyria and that their God would not save them either (2 Kings 18:28–35).',
        'Hezekiah tore his clothes, went to the temple, and sent messengers to Isaiah. Isaiah’s message was that Sennacherib would not enter the city or even shoot an arrow there (2 Kings 19:32). That night, the Bible says, the angel of the LORD struck the Assyrian camp, and Sennacherib went home to Nineveh, where he was later killed by two of his own sons (2 Kings 19:35–37).',
      ],
    },
    {
      heading: 'The major players',
      paragraphs: [
        'Hezekiah, king of Judah. He had rebelled against Assyria, and he prepared Jerusalem for a siege, including a tunnel that brought spring water inside the city walls (2 Kings 20:20).',
        'Sennacherib, king of Assyria, ruling from Nineveh in what is now northern Iraq.',
        'Isaiah, the prophet, who told Hezekiah not to be afraid (Isaiah 36–37 tells the same story).',
        'The field commander (“Rabshakeh”), Sennacherib’s spokesman at the walls.',
        'Egypt and Cush. Judah had hoped for help from them, and Tirhakah, king of Cush, marched out against Assyria (2 Kings 19:9).',
      ],
    },
    {
      heading: 'What Assyria’s own records say',
      paragraphs: [
        'This is one of the few Bible events that the other side wrote down too. Sennacherib’s annals, carved on clay prisms now in the British Museum and in Chicago, boast that he shut Hezekiah up in Jerusalem “like a bird in a cage” and list the heavy tribute Hezekiah paid. Notice what they do not claim: that he took the city. His palace walls in Nineveh show the capture of Lachish instead, in carved reliefs you can still see in the British Museum.',
      ],
    },
    {
      heading: 'Other settings people suggest',
      paragraphs: [
        'Some readers connect it to an earlier rescue, when King Jehoshaphat faced Moab and Ammon and the Korahite singers praised God before the battle (2 Chronicles 20:19). Others read it as a song for every time the nations rage.',
      ],
    },
    {
      heading: 'Why it was written',
      passages: [{ text: 'The LORD Almighty is with us; the God of Jacob is our fortress.', ref: 'Psalm 46:7 (NIV)' }],
      paragraphs: [
        'The heading says “Of the Sons of Korah,” the temple singers, so we don’t know one author’s name. The Hebrew can mean the song was by them, for them, or part of their collection. What we do know is its purpose: it was written to be sung in worship. Its chorus repeats twice, word for word, in verses 7 and 11, so a frightened people would have the words ready when the walls were surrounded.',
        'One more detail: verse 4 sings of “a river whose streams make glad the city of God.” Jerusalem has no river. The psalm is saying that what keeps the city alive is not its water supply or its walls, but God himself.',
      ],
    },
  ],
  voices: [
    {
      name: 'Lord Byron',
      dates: '1788–1824',
      kind: 'Thematic connection',
      body:
        'The English poet retold the night the Assyrian army fell in “The Destruction of Sennacherib” (1815), which begins, “The Assyrian came down like the wolf on the fold.” It is a poem about 2 Kings 19, not a commentary on Psalm 46.',
      source: 'Lord Byron, “The Destruction of Sennacherib,” in Hebrew Melodies (1815)',
    },
  ],
  readMore: [
    { label: 'The siege of Jerusalem: 2 Kings 18–19 (NIV)', url: 'https://www.biblegateway.com/passage/?search=2%20Kings%2018-19&version=NIV' },
    { label: 'The same story from Isaiah’s side: Isaiah 36–37 (NIV)', url: 'https://www.biblegateway.com/passage/?search=Isaiah%2036-37&version=NIV' },
    { label: 'Jehoshaphat and the Korahite singers: 2 Chronicles 20 (NIV)', url: 'https://www.biblegateway.com/passage/?search=2%20Chronicles%2020&version=NIV' },
    { label: 'Sennacherib’s Prism and the Lachish reliefs, British Museum (London)' },
  ],
};
