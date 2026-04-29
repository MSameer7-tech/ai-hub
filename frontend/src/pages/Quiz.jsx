import { useEffect, useState } from "react";
import { startQuiz } from "../services/api";

function Quiz() {
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  const currentQuestion = questions[currentIndex];

  const startNewQuiz = async (count) => {
    setIsStarting(true);
    setQuizFinished(false);
    setScore(0);
    setCurrentIndex(0);
    setAnswered(false);
    setResult(null);
    setSelectedAnswer("");

    try {
      const res = await startQuiz(count);
      const fetchedQuestions = res.data?.questions || [];
      setQuestions(fetchedQuestions);
    } catch (err) {
      console.error("Failed to start quiz:", err);
      setQuestions([]);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStart = () => {
    startNewQuiz(totalQuestions);
  };

  const handleRestart = () => {
    if (isStarting) return;
    
    // Fully reset all state to prevent stale UI issues
    setScore(0);
    setCurrentIndex(0);
    setSelectedAnswer("");
    setResult(null);
    setAnswered(false);
    setQuizFinished(false);
    setQuestions([]); // Clear old questions to force a fresh render
    
    // Immediately fetch fresh questions
    startNewQuiz(totalQuestions);
  };

  const handleSubmit = () => {
    if (!currentQuestion || !selectedAnswer || answered) return;

    const isCorrect = selectedAnswer.trim().toLowerCase() === currentQuestion.correct_answer.trim().toLowerCase();
    
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setResult({
      correct: isCorrect,
      correct_answer: currentQuestion.correct_answer,
    });
    setAnswered(true);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer("");
      setResult(null);
      setAnswered(false);
    } else {
      setQuizFinished(true);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 text-gray-800 dark:text-white">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <h1 className="mb-3 text-3xl font-semibold text-gray-900 dark:text-white">
          UPSC & Current Affairs Quiz
        </h1>
        <p className="mb-6 text-gray-500 dark:text-neutral-300">
          Practice UPSC-style questions across polity, economy, geography, and current affairs.
        </p>

        {!questions.length && !isStarting && !quizFinished && (
          <div className="mb-8 flex items-center gap-4">
            <select
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(Number(e.target.value))}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={20}>20 Questions</option>
            </select>
            <button
              onClick={handleStart}
              className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 transition-all"
            >
              Start Quiz
            </button>
          </div>
        )}

        {isStarting && <div className="py-10 text-center animate-pulse">Fetching expert questions...</div>}

        {questions.length > 0 && !quizFinished && (
          <div>
            <div className="mb-6 flex justify-between items-center text-sm font-medium">
              <div className="flex gap-2">
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-blue-500">
                  {currentQuestion.category}
                </span>
                <span className={`rounded-full px-3 py-1 ${
                  currentQuestion.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500' : 
                  currentQuestion.difficulty === 'Hard' ? 'bg-red-500/10 text-red-500' : 
                  'bg-orange-500/10 text-orange-500'
                }`}>
                  {currentQuestion.difficulty}
                </span>
              </div>
              <span className="text-gray-400">Q {currentIndex + 1} / {questions.length}</span>
            </div>

            <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-neutral-700 dark:bg-neutral-800/50">
              <p className="text-lg font-medium leading-relaxed">{currentQuestion.question}</p>
            </div>

            <div className="grid gap-3 mb-8">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = answered && option === currentQuestion.correct_answer;
                const isWrong = answered && isSelected && option !== currentQuestion.correct_answer;

                let classes = "border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-800";
                if (isSelected) classes = "border-blue-500 bg-blue-500/10 shadow-sm";
                if (isCorrect) classes = "border-green-500 bg-green-500/20";
                if (isWrong) classes = "border-red-500 bg-red-500/20";

                return (
                  <button
                    key={option}
                    onClick={() => !answered && setSelectedAnswer(option)}
                    disabled={answered}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${classes} ${answered ? "cursor-default" : "hover:border-blue-400"}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {!answered ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedAnswer}
                className="w-full rounded-xl bg-teal-600 py-4 font-bold text-white disabled:opacity-50 transition-all hover:bg-teal-700"
              >
                Submit Answer
              </button>
            ) : (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${result.correct ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <p className="font-bold">{result.correct ? "✅ Correct!" : `❌ Incorrect. The right answer was: ${currentQuestion.correct_answer}`}</p>
                </div>
                <button
                  onClick={handleNextQuestion}
                  className="w-full rounded-xl bg-blue-600 py-4 font-bold text-white hover:bg-blue-700 transition-all"
                >
                  {currentIndex + 1 < questions.length ? "Next Question" : "Finish Quiz"}
                </button>
              </div>
            )}
          </div>
        )}

        {quizFinished && !isStarting && (
          <div className="py-10 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">Quiz Complete!</h2>
            <p className="mb-8 text-xl text-gray-600 dark:text-gray-300">
              Final Score: <span className="font-black text-blue-500">{score}</span> / {questions.length}
            </p>
            <div className="flex justify-center gap-4">
                <button
                onClick={handleRestart}
                disabled={isStarting}
                className="rounded-xl bg-orange-600 px-10 py-4 font-bold text-white hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50"
                >
                Restart
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Quiz;
