export const validLlmJson = JSON.stringify({
  question: "What is 2+2?",
  choices: ["1", "2", "3", "4"],
  correctIndex: 3,
  explanation: "2 + 2 = 4",
});

export const malformedLlmJson = "not json";
