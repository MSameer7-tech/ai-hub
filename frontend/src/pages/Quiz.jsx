import { useEffect, useState } from "react";

import { startQuiz, submitAnswer } from "../services/api";

function Quiz() {
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    const savedScore = localStorage.getItem("quizScore");

    if (savedScore) {
      const parsedScore = JSON.parse(savedScore);
      setScore(parsedScore.score ?? 0);
      setTotal(parsedScore.total ?? 0);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("quizScore", JSON.stringify({ score, total }));
  }, [score, total]);

  useEffect(() => {
    setAnswered(false);
  }, [currentIndex]);

  const currentQuestion = questions[currentIndex];

  const startQuizWithCount = async (questionCount) => {
    if (isStarting) {
      return;
    }

    setIsStarting(true);

    try {
      const res = await startQuiz(questionCount);
      const firstQuestion = res.data?.question;
      setQuestions(firstQuestion ? [firstQuestion] : []);
      setCurrentIndex(0);
      setSelectedAnswer("");
      setResult(null);
      setAnswered(false);
      setScore(0);
      setTotal(typeof res.data?.total === "number" ? res.data.total : questionCount);
      setQuizFinished(false);
    } catch {
      setQuestions([]);
      setCurrentIndex(0);
      setSelectedAnswer("");
      setResult(null);
      setAnswered(false);
      setScore(0);
      setTotal(0);
      setQuizFinished(false);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStart = async () => {
    await startQuizWithCount(totalQuestions);
  };

  const handleSubmit = async () => {
    if (!currentQuestion || !selectedAnswer || isSubmitting || answered) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitAnswer({
        index: currentIndex,
        answer: selectedAnswer,
      });

      setResult(res.data);
      setTotal(typeof res.data.total === "number" ? res.data.total : questions.length);
      setScore(typeof res.data.score === "number" ? res.data.score : score);
      setQuizFinished(Boolean(res.data.finished));
      setAnswered(true);

      if (
        res.data.next_question &&
        currentIndex === questions.length - 1
      ) {
        setQuestions((currentQuestions) => [
          ...currentQuestions,
          res.data.next_question,
        ]);
      }
    } catch {
      setResult({
        correct: false,
        correct_answer: "",
        explanation: "Unable to evaluate the answer right now.",
      });
      setAnswered(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((index) => index + 1);
      setSelectedAnswer("");
      setResult(null);
      setAnswered(false);
      return;
    }

    setQuizFinished(true);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 text-gray-800 dark:text-white">
      <div
        className="mx-auto max-w-4xl rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:shadow-2xl dark:shadow-slate-950/30"
        style={{
          padding: "32px",
        }}
      >
        <h1 className="mb-3 text-3xl font-semibold text-gray-900 dark:text-white">
          Quiz
        </h1>
        <p className="mb-6 text-gray-500 dark:text-neutral-300" style={{ lineHeight: 1.6 }}>
          Start a question from the current affairs dataset, submit your answer,
          and review the explanation.
        </p>
        <p className="mb-5 font-semibold text-gray-900 dark:text-white">
          Score: {score}/{total}
        </p>
        <p className="mb-4 text-gray-400 dark:text-neutral-400">
          {questions.length
            ? `Question ${Math.min(currentIndex + 1, total)} of ${total}`
            : `Select a quiz length and start when you're ready.`}
        </p>

        <div style={{ marginBottom: "20px", display: "flex", gap: "12px", alignItems: "center" }}>
          <label htmlFor="quiz-total" className="font-semibold text-gray-700 dark:text-neutral-200">
            Number of questions
          </label>
          <select
            id="quiz-total"
            value={totalQuestions}
            onChange={(e) => setTotalQuestions(Number(e.target.value))}
            disabled={isStarting || isSubmitting}
            style={{
              borderRadius: "12px",
              padding: "10px 12px",
              background: "transparent",
            }}
            className="border border-gray-200 bg-white text-gray-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            <option value={5}>5 Questions</option>
            <option value={10}>10 Questions</option>
            <option value={15}>15 Questions</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={isStarting}
          className="transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          style={{
            border: "none",
            borderRadius: "14px",
            padding: "14px 20px",
            background: isStarting ? "#f1b866" : "#d97706",
            color: "#ffffff",
            fontWeight: 700,
            cursor: isStarting ? "not-allowed" : "pointer",
          }}
        >
          {isStarting ? "Loading..." : questions.length ? "Restart Quiz" : "Start Quiz"}
        </button>

        {isStarting && (
          <p className="mt-4 text-gray-500 dark:text-neutral-300">Generating quiz...</p>
        )}

        <div
          className="border border-gray-200 bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800/70"
          style={{
            marginTop: "24px",
            padding: "22px",
            borderRadius: "20px",
            minHeight: "96px",
          }}
        >
          <h2 className="mb-2 text-[1.1rem] text-blue-400 dark:text-blue-300">
            Question
          </h2>
          <p className="text-gray-700 dark:text-neutral-200" style={{ margin: 0, lineHeight: 1.6 }}>
            {currentQuestion?.question || "Click Start Quiz to load a question."}
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          {(currentQuestion?.options || []).map((option, index) => {
            const optionLetter = String.fromCharCode(65 + index);
            const isSelected = selectedAnswer === optionLetter;
            const isCorrectAnswer = currentQuestion?.answer === optionLetter;
            const isWrongSelection = answered && isSelected && !isCorrectAnswer;

            let optionClasses =
              "border-gray-200 bg-white hover:scale-[1.01] hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-800";

            if (isSelected) {
              optionClasses = "border-blue-500 bg-blue-500/10";
            }

            if (answered && isCorrectAnswer) {
              optionClasses = "border-green-500 bg-green-500/10";
            }

            if (isWrongSelection) {
              optionClasses = "border-red-500 bg-red-500/10";
            }

            return (
              <button
                key={`${optionLetter}-${option}`}
                type="button"
                onClick={() => {
                  if (!answered) {
                    setSelectedAnswer(optionLetter);
                  }
                }}
                disabled={answered}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition-all duration-200 ease-in-out active:scale-95 ${
                  answered ? "cursor-not-allowed" : "cursor-pointer"
                } ${optionClasses}`}
                style={{ opacity: answered && !isSelected && !isCorrectAnswer ? 0.78 : 1 }}
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700 dark:bg-neutral-700 dark:text-neutral-200">
                    {optionLetter}
                  </span>
                  <span className="leading-6 text-gray-800 dark:text-neutral-100">{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!currentQuestion || !selectedAnswer || isSubmitting || answered}
          className="transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          style={{
            marginTop: "16px",
            border: "none",
            borderRadius: "14px",
            padding: "14px 20px",
            background:
              !currentQuestion || !selectedAnswer || isSubmitting || answered
                ? "#94a3b8"
                : "#0f766e",
            color: "#ffffff",
            fontWeight: 700,
            cursor:
              !currentQuestion || !selectedAnswer || isSubmitting || answered
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isSubmitting ? "Submitting..." : "Submit Answer"}
        </button>

        {result && (
          <div
            className={`mt-5 rounded-2xl border p-5 ${
              result.correct
                ? "border-green-500/40 bg-green-500/10"
                : "border-red-500/40 bg-red-500/10"
            }`}
          >
            <h3 style={{ margin: "0 0 10px", color: "#ffffff" }}>
              {result.correct ? "✅ Correct" : "❌ Incorrect"}
            </h3>
            <p style={{ margin: 0, color: "#d1d5db", lineHeight: 1.6 }}>
              {result.explanation}
            </p>
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={isStarting || quizFinished}
              className="transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
              style={{
                marginTop: "16px",
                border: "none",
                borderRadius: "14px",
                padding: "12px 18px",
                background: isStarting || quizFinished ? "#f1b866" : "#d97706",
                color: "#ffffff",
                fontWeight: 700,
                cursor: isStarting || quizFinished ? "not-allowed" : "pointer",
              }}
            >
              {quizFinished
                ? "Quiz Complete"
                : currentIndex + 1 < total
                ? "Next Question"
                : "Finish Quiz"}
            </button>
          </div>
        )}

        {quizFinished && (
          <div
            className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-5"
          >
            <h3 style={{ margin: "0 0 10px", color: "#ffffff" }}>
              Quiz complete
            </h3>
            <p style={{ margin: "0 0 16px", color: "#d1d5db", lineHeight: 1.6 }}>
              You scored {score} out of {total}. How many next questions would you like?
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {[5, 10, 15].map((questionCount) => (
                <button
                  key={questionCount}
                  type="button"
                  onClick={() => {
                    setTotalQuestions(questionCount);
                    void startQuizWithCount(questionCount);
                  }}
                  disabled={isStarting}
                  style={{
                    border: "none",
                    borderRadius: "14px",
                    padding: "12px 18px",
                    background: isStarting ? "#f1b866" : "#d97706",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: isStarting ? "not-allowed" : "pointer",
                  }}
                >
                  {isStarting ? "Loading..." : `${questionCount} Questions`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Quiz;
