import { useEffect, useState } from "react";
import { startQuiz } from "../services/api";
import { motion } from "framer-motion";

function Quiz({ theme, setTheme }) {
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
    <div className="relative flex-1 overflow-y-auto px-4 md:px-6 pt-16 md:pt-24 pb-32 md:pb-12 text-gray-800 dark:text-white no-scrollbar">
      {/* Background Decorative Glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] md:h-[500px] w-[500px] md:w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[80px] md:blur-[120px] dark:bg-blue-500/10" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto max-w-5xl rounded-[32px] md:rounded-[40px] border border-gray-100 bg-white p-6 md:p-10 shadow-2xl transition-all dark:border-white/5 dark:bg-[#111827]/60 dark:backdrop-blur-3xl"
      >
        <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-8 md:mb-10">
            <div className="max-w-2xl">
                <h1 className="text-2xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                UPSC <span className="text-blue-500">Expert Quiz</span>
                </h1>
                <p className="mt-2 md:mt-3 text-sm md:text-lg text-gray-500 dark:text-neutral-400">
                Practice UPSC-style questions across polity, economy, and current affairs.
                </p>
            </div>
            {questions.length > 0 && !quizFinished && (
                <div className={`flex flex-col items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full border-[4px] md:border-[5px] shadow-lg transition-all duration-300 ${
                    timeLeft <= 10 
                    ? 'border-red-500 text-red-500 shadow-red-500/20' 
                    : 'border-blue-500 text-blue-500 shadow-blue-500/20'
                }`}>
                    <span className="text-xl md:text-2xl font-black">{timeLeft}</span>
                    <span className="text-[8px] md:text-[10px] uppercase font-bold tracking-tighter">Seconds</span>
                </div>
            )}
        </div>

        {!questions.length && !isStarting && !quizFinished && (
          <div className="space-y-8 md:space-y-10">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4 md:gap-6">
                <div className="flex-1 flex flex-col gap-2 md:gap-3">
                    <label className="ml-1 text-[9px] md:text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-neutral-500">
                        Quantity
                    </label>
                    <div className="relative">
                        <select
                        value={totalQuestions}
                        onChange={(e) => setTotalQuestions(Number(e.target.value))}
                        className="h-14 md:h-[68px] w-full appearance-none rounded-xl md:rounded-2xl border border-gray-200 bg-white px-5 md:px-7 text-sm md:text-base font-bold text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10"
                        >
                            <option value={5}>5 Questions</option>
                            <option value={10}>10 Questions</option>
                            <option value={15}>15 Questions</option>
                        </select>
                        <div className="pointer-events-none absolute right-5 md:right-6 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col gap-2 md:gap-3">
                    <label className="ml-1 text-[9px] md:text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-neutral-500">
                        Difficulty
                    </label>
                    <div className="relative">
                        <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="h-14 md:h-[68px] w-full appearance-none rounded-xl md:rounded-2xl border border-gray-200 bg-white px-5 md:px-7 text-sm md:text-base font-bold text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10"
                        >
                            <option value="easy">Easy Level</option>
                            <option value="medium">Standard Level</option>
                            <option value="hard">Advanced Level</option>
                        </select>
                        <div className="pointer-events-none absolute right-5 md:right-6 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <button
                onClick={handleStart}
                className="group relative h-14 md:h-[68px] flex-1 overflow-hidden rounded-xl md:rounded-2xl bg-blue-600 px-6 md:px-8 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:scale-[1.02] hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-600/30 active:scale-95"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2 md:gap-3">
                        Initialize
                        <svg className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </span>
                </button>
            </div>

            <div className="flex flex-col md:flex-row md:flex-wrap gap-4 md:gap-8 border-t border-gray-100 pt-6 dark:border-white/5">
                <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                        <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        ~{totalQuestions * 1} Min Estimated
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                        <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {difficulty === "hard" ? "Advanced Standard" : "Curated Practice"}
                    </span>
                </div>
            </div>
          </div>
        )}


        {isStarting && <div className="py-10 text-center animate-pulse text-gray-400 text-sm font-medium">Fetching expert questions...</div>}

        {questions.length > 0 && !quizFinished && (
          <div className="mt-2 md:mt-4">
            <div className="mb-4 md:mb-6 flex justify-between items-center text-[10px] md:text-sm font-medium">
              <div className="flex gap-2">
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-blue-500 border border-blue-500/20 truncate max-w-[120px] md:max-w-none">
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
              <span className="text-gray-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">Q {currentIndex + 1}/{questions.length}</span>
            </div>

            <div className="mb-6 md:mb-8 rounded-2xl border border-gray-200 bg-gray-50 p-5 md:p-7 dark:border-neutral-700 dark:bg-neutral-800/50 shadow-inner">
              <p className="text-base md:text-xl font-bold leading-relaxed text-gray-800 dark:text-gray-100">{currentQuestion.question}</p>
            </div>

            <div className="grid gap-2 md:gap-3 mb-6 md:mb-8">
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
                    className={`w-full rounded-xl md:rounded-2xl border p-4 md:p-5 text-left transition-all duration-200 ${classes} ${answered ? "cursor-default" : "hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-neutral-800"}`}
                  >
                    <div className="flex items-center gap-3">
                        <span className={`w-5 h-5 md:w-6 md:h-6 rounded-full border flex items-center justify-center text-[10px] md:text-xs font-black shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-gray-400'}`}>
                            {String.fromCharCode(65 + currentQuestion.options.indexOf(option))}
                        </span>
                        <span className="font-semibold text-sm md:text-base">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {!answered ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedAnswer}
                className="w-full rounded-xl md:rounded-2xl bg-teal-600 py-4 md:py-5 font-black text-white uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-teal-700 shadow-xl active:scale-95"
              >
                Submit Answer
              </button>
            ) : (
              <div className="space-y-4">
                <div className={`p-4 md:p-5 rounded-xl md:rounded-2xl border-2 ${result.correct ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                  <p className="font-black text-base md:text-lg">
                    {timeLeft === 0 && !selectedAnswer ? "⏰ Time's Up!" : result.correct ? "✅ Correct!" : "❌ Incorrect"}
                  </p>
                  {!result.correct && (
                      <p className="mt-1 text-xs md:text-sm opacity-80 font-medium">Correct: <span className="font-bold underline">{currentQuestion.correct_answer}</span></p>
                  )}
                </div>
                <button
                  onClick={handleNextQuestion}
                  className="w-full rounded-xl md:rounded-2xl bg-blue-600 py-4 md:py-5 font-black text-white uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl active:scale-95"
                >
                  {currentIndex + 1 < questions.length ? "Next Question" : "Finish Quiz"}
                </button>
              </div>
            )}
          </div>
        )}

        {quizFinished && !isStarting && (
          <div className="py-8 md:py-12 text-center">
            <div className="mb-4 md:mb-6 inline-flex p-4 md:p-5 rounded-full bg-blue-500/10 text-blue-500 ring-4 ring-blue-500/5">
                <svg className="w-10 h-10 md:w-12 md:h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h2 className="mb-2 md:mb-4 text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter">Quiz Complete!</h2>
            <p className="mb-8 md:mb-10 text-lg md:text-2xl text-gray-600 dark:text-gray-300 font-medium">
              Score: <span className="font-black text-blue-500 text-3xl md:text-4xl">{score}</span> / {questions.length}
            </p>
            <div className="flex justify-center">
                <button
                onClick={handleRestart}
                disabled={isStarting}
                className="w-full md:w-auto rounded-xl md:rounded-2xl bg-orange-600 px-10 md:px-14 py-4 md:py-5 font-black text-white uppercase tracking-widest hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50 shadow-2xl"
                >
                Restart
                </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default Quiz;
