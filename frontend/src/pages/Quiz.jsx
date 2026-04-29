import { useEffect, useState } from "react";
import { startQuiz } from "../services/api";

function Quiz() {
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(45);
  const [timerActive, setTimerActive] = useState(false);

  const currentQuestion = questions[currentIndex];

  const getTimerValue = (diff) => {
    if (diff === "easy") return 30;
    if (diff === "hard") return 60;
    return 45;
  };

  const startNewQuiz = async (count, diff) => {
    setIsStarting(true);
    setQuizFinished(false);
    setScore(0);
    setCurrentIndex(0);
    setAnswered(false);
    setResult(null);
    setSelectedAnswer("");
    setTimeLeft(getTimerValue(diff));

    try {
      const res = await startQuiz(count, diff);
      const fetchedQuestions = res.data?.questions || [];
      setQuestions(fetchedQuestions);
      setTimerActive(true);
    } catch (err) {
      console.error("Failed to start quiz:", err);
      setQuestions([]);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStart = () => {
    startNewQuiz(totalQuestions, difficulty);
  };

  const handleRestart = () => {
    if (isStarting) return;
    setScore(0);
    setCurrentIndex(0);
    setSelectedAnswer("");
    setResult(null);
    setAnswered(false);
    setQuizFinished(false);
    setQuestions([]);
    startNewQuiz(totalQuestions, difficulty);
  };

  const handleSubmit = () => {
    if (!currentQuestion || answered) return;
    setTimerActive(false);

    const isCorrect = selectedAnswer && selectedAnswer.trim().toLowerCase() === currentQuestion.correct_answer.trim().toLowerCase();
    
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setResult({
      correct: !!isCorrect,
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
      setTimeLeft(getTimerValue(difficulty));
      setTimerActive(true);
    } else {
      setQuizFinished(true);
      setTimerActive(false);
    }
  };

  // Timer Effect
  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      handleSubmit(); // Auto-submit when time is up
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  return (
    <div className="flex-1 overflow-y-auto p-6 text-gray-800 dark:text-white">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex justify-between items-start mb-2">
            <div>
                <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
                UPSC & Current Affairs Quiz
                </h1>
                <p className="mt-2 text-gray-500 dark:text-neutral-300">
                Practice UPSC-style questions across polity, economy, geography, and current affairs.
                </p>
            </div>
            {questions.length > 0 && !quizFinished && (
                <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-full border-4 transition-colors ${
                    timeLeft <= 10 ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500'
                }`}>
                    <span className="text-xl font-black">{timeLeft}</span>
                    <span className="text-[10px] uppercase font-bold">Sec</span>
                </div>
            )}
        </div>

        {!questions.length && !isStarting && !quizFinished && (
          <div className="mb-8 flex flex-wrap items-center gap-6 mt-8">
            <div className="flex flex-col gap-2 min-w-[200px]">
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Number of Questions</label>
                <select
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Number(e.target.value))}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-4 font-bold text-gray-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
                </select>
            </div>
            
            <div className="flex flex-col gap-2 min-w-[200px]">
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Select Difficulty</label>
                <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-4 font-bold text-gray-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                </select>
            </div>

            <button
              onClick={handleStart}
              className="mt-6 rounded-2xl bg-blue-600 px-10 py-4.5 font-black text-white uppercase tracking-widest hover:bg-blue-700 transition-all shadow-[0_10px_30px_rgba(37,99,235,0.3)] active:scale-95"
            >
              Start Quiz
            </button>
          </div>
        )}


        {isStarting && <div className="py-10 text-center animate-pulse text-gray-400 font-medium">Fetching expert questions from OpenTriviaDB...</div>}

        {questions.length > 0 && !quizFinished && (
          <div className="mt-4">
            <div className="mb-6 flex justify-between items-center text-sm font-medium">
              <div className="flex gap-2">
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-blue-500 border border-blue-500/20">
                  {currentQuestion.category}
                </span>
                <span className={`rounded-full px-3 py-1 border ${
                  currentQuestion.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                  currentQuestion.difficulty === 'Hard' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                  'bg-orange-500/10 text-orange-500 border-orange-500/20'
                }`}>
                  {currentQuestion.difficulty}
                </span>
              </div>
              <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Question {currentIndex + 1} of {questions.length}</span>
            </div>

            <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 p-7 dark:border-neutral-700 dark:bg-neutral-800/50 shadow-inner">
              <p className="text-xl font-bold leading-relaxed text-gray-800 dark:text-gray-100">{currentQuestion.question}</p>
            </div>

            <div className="grid gap-3 mb-8">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = answered && option === currentQuestion.correct_answer;
                const isWrong = answered && isSelected && option !== currentQuestion.correct_answer;

                let classes = "border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-800";
                if (isSelected) classes = "border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/50";
                if (isCorrect) classes = "border-green-500 bg-green-500/20 ring-1 ring-green-500/50";
                if (isWrong) classes = "border-red-500 bg-red-500/20 ring-1 ring-red-500/50";

                return (
                  <button
                    key={option}
                    onClick={() => !answered && setSelectedAnswer(option)}
                    disabled={answered}
                    className={`w-full rounded-2xl border p-5 text-left transition-all duration-200 ${classes} ${answered ? "cursor-default" : "hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-neutral-800"}`}
                  >
                    <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-black ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-gray-400'}`}>
                            {String.fromCharCode(65 + currentQuestion.options.indexOf(option))}
                        </span>
                        <span className="font-semibold">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {!answered ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedAnswer}
                className="w-full rounded-2xl bg-teal-600 py-5 font-black text-white uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-teal-700 shadow-xl active:scale-95"
              >
                Submit Answer
              </button>
            ) : (
              <div className="space-y-4">
                <div className={`p-5 rounded-2xl border-2 ${result.correct ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                  <p className="font-black text-lg">
                    {timeLeft === 0 && !selectedAnswer ? "⏰ Time's Up!" : result.correct ? "✅ Correct!" : "❌ Incorrect"}
                  </p>
                  {!result.correct && (
                      <p className="mt-1 text-sm opacity-80 font-medium">The correct answer was: <span className="font-bold underline">{currentQuestion.correct_answer}</span></p>
                  )}
                </div>
                <button
                  onClick={handleNextQuestion}
                  className="w-full rounded-2xl bg-blue-600 py-5 font-black text-white uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl active:scale-95"
                >
                  {currentIndex + 1 < questions.length ? "Next Question" : "Finish Quiz"}
                </button>
              </div>
            )}
          </div>
        )}

        {quizFinished && !isStarting && (
          <div className="py-12 text-center">
            <div className="mb-6 inline-flex p-5 rounded-full bg-blue-500/10 text-blue-500 ring-4 ring-blue-500/5">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h2 className="mb-4 text-5xl font-black text-gray-900 dark:text-white tracking-tighter">Quiz Complete!</h2>
            <p className="mb-10 text-2xl text-gray-600 dark:text-gray-300 font-medium">
              Your Final Score: <span className="font-black text-blue-500 text-4xl">{score}</span> / {questions.length}
            </p>
            <div className="flex justify-center gap-6">
                <button
                onClick={handleRestart}
                disabled={isStarting}
                className="rounded-2xl bg-orange-600 px-14 py-5 font-black text-white uppercase tracking-widest hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50 shadow-2xl"
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
