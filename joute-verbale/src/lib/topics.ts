export type Topic = {
  motion: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
};

export const topics: Topic[] = [
  // Science & Technology
  {
    motion: "Nuclear energy is essential for fighting climate change",
    category: "science-policy",
    difficulty: "medium",
    tags: ["energy", "climate", "environment"],
  },
  {
    motion: "AI will replace more jobs than it creates within 10 years",
    category: "science-policy",
    difficulty: "medium",
    tags: ["ai", "jobs", "technology"],
  },
  {
    motion: "Social media has done more harm than good to society",
    category: "science-policy",
    difficulty: "easy",
    tags: ["social-media", "society", "technology"],
  },
  {
    motion:
      "Space exploration is a waste of money while Earth's problems remain unsolved",
    category: "science-policy",
    difficulty: "medium",
    tags: ["space", "economics", "priorities"],
  },
  {
    motion: "Genetic editing of human embryos should be allowed",
    category: "science-policy",
    difficulty: "hard",
    tags: ["genetics", "ethics", "science"],
  },

  // Society & Culture
  {
    motion: "University degrees are no longer worth the investment",
    category: "society",
    difficulty: "easy",
    tags: ["education", "economics", "career"],
  },
  {
    motion: "Remote work is better than office work for most jobs",
    category: "society",
    difficulty: "easy",
    tags: ["work", "productivity", "lifestyle"],
  },
  {
    motion: "The voting age should be lowered to 16",
    category: "society",
    difficulty: "medium",
    tags: ["politics", "youth", "democracy"],
  },
  {
    motion: "Billionaires should not exist",
    category: "society",
    difficulty: "medium",
    tags: ["economics", "inequality", "politics"],
  },
  {
    motion: "Cancel culture does more harm than good",
    category: "society",
    difficulty: "medium",
    tags: ["culture", "free-speech", "accountability"],
  },

  // Everyday & Fun
  {
    motion: "Pineapple belongs on pizza",
    category: "fun",
    difficulty: "easy",
    tags: ["food", "culture", "opinion"],
  },
  {
    motion: "Cats are better pets than dogs",
    category: "fun",
    difficulty: "easy",
    tags: ["pets", "animals", "lifestyle"],
  },
  {
    motion: "The book is always better than the movie",
    category: "fun",
    difficulty: "easy",
    tags: ["entertainment", "culture", "media"],
  },
  {
    motion: "Morning people are more productive than night owls",
    category: "fun",
    difficulty: "easy",
    tags: ["productivity", "lifestyle", "health"],
  },
  {
    motion: "Texting has ruined the art of conversation",
    category: "fun",
    difficulty: "easy",
    tags: ["communication", "technology", "culture"],
  },

  // Philosophy & Ethics
  {
    motion: "It is ethical to eat meat",
    category: "philosophy",
    difficulty: "medium",
    tags: ["ethics", "food", "environment"],
  },
  {
    motion: "Privacy is more important than security",
    category: "philosophy",
    difficulty: "hard",
    tags: ["privacy", "security", "rights"],
  },
  {
    motion: "Free will is an illusion",
    category: "philosophy",
    difficulty: "hard",
    tags: ["philosophy", "neuroscience", "determinism"],
  },
  {
    motion: "The death penalty is never justified",
    category: "philosophy",
    difficulty: "hard",
    tags: ["justice", "ethics", "law"],
  },
  {
    motion: "It is better to be feared than loved as a leader",
    category: "philosophy",
    difficulty: "medium",
    tags: ["leadership", "philosophy", "power"],
  },
];

export function getRandomTopic(): Topic {
  return topics[Math.floor(Math.random() * topics.length)];
}

export function getRandomSide(): "FOR" | "AGAINST" {
  return Math.random() < 0.5 ? "FOR" : "AGAINST";
}
