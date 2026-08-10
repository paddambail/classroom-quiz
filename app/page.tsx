"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Question = {
  id?: string;
  question: string;
  options: string[];
  correct: number;
};

export default function Home() {
  const [screen, setScreen] = useState("home");

  const [quizName, setQuizName] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gamePin, setGamePin] = useState("");
  const [studentsJoined, setStudentsJoined] = useState(0);
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [saving, setSaving] = useState(false);
  const [studentPin, setStudentPin] = useState("");
  const [studentName, setStudentName] = useState("");
  const [waitingName, setWaitingName] = useState("");
  const [waitingQuizId, setWaitingQuizId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [questionStartAt, setQuestionStartAt] = useState<number | null>(null);
  const [acceptingAnswers, setAcceptingAnswers] = useState(false);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{ id: string; name: string; points: number }>>([]);

  function saveQuestion() {
    if (!question.trim()) {
      alert("Please enter a question.");
      return;
    }

    if (options.some((option) => !option.trim())) {
      alert("Please fill all 4 options.");
      return;
    }

    setQuestions([
      ...questions,
      {
        question,
        options,
        correct,
      },
    ]);

    setQuestion("");
    setOptions(["", "", "", ""]);
    setCorrect(0);
  }

  function createGamePin() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async function generateUniqueGamePin(attempts = 0): Promise<string> {
    const pin = createGamePin();
    const { data, error } = await supabase
      .from("quizzes")
      .select("game_pin")
      .eq("game_pin", pin)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      if (attempts >= 5) {
        throw new Error("Unable to generate a unique game PIN.");
      }
      return generateUniqueGamePin(attempts + 1);
    }

    return pin;
  }

  async function saveQuiz() {
    if (saving) {
      return;
    }

    if (!quizName.trim()) {
      alert("Please enter a quiz name.");
      return;
    }

    if (questions.length === 0) {
      alert("Please add at least one question before saving.");
      return;
    }

    setSaving(true);

    try {
      const pin = await generateUniqueGamePin();

      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .insert([
          {
            title: quizName.trim(),
            game_pin: pin,
            status: "waiting",
          },
        ])
        .select("id")
        .single();

      if (quizError || !quizData?.id) {
        throw quizError ?? new Error("Failed to create quiz.");
      }

      setCurrentQuizId(quizData.id);
      setIsHost(true);
      try { sessionStorage.setItem('cq_role','host'); } catch (e) {}
      setStudentsJoined(0);

      const formattedQuestions = questions.map((q, index) => ({
        quiz_id: quizData.id,
        question_text: q.question,
        option_a: q.options[0],
        option_b: q.options[1],
        option_c: q.options[2],
        option_d: q.options[3],
        correct_answer: String.fromCharCode(65 + q.correct),
        time_limit: 5,
        question_order: index + 1,
      }));

      const { error: questionsError } = await supabase
        .from("questions")
        .insert(formattedQuestions);

      if (questionsError) {
        throw questionsError;
      }

      setGamePin(pin);
      setCurrentQuestionIndex(0);
      setCountdown(5);
      setScreen("ready");
    } catch (error) {
      console.error("Save quiz failed:", error);
      alert("Unable to save quiz. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function startQuiz() {
    if (!isHost) {
      console.warn('startQuiz blocked: not host');
      return;
    }
    if (!currentQuizId) {
      // if no quiz saved, fallback to creating
      if (questions.length === 0) {
        setScreen("create");
        return;
      }
      setCurrentQuestionIndex(0);
      setCountdown(5);
      setScreen("question");
      return;
    }

    // Update quiz row in Supabase to mark it active and set current_question to 0
    supabase
      .from("quizzes")
      .update({ status: "active", current_question: 0 })
      .eq("id", currentQuizId)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to start quiz:", error);
          alert("Unable to start quiz. Try again.");
          return;
        }

        setCurrentQuestionIndex(0);
        setCountdown(5);
        setScreen("question");
      });
  }

  async function joinQuiz() {
    setJoinError("");

    const pin = (studentPin || "").trim();
    const name = (studentName || "").trim();

    // Validate inputs: 6-digit numeric PIN and non-empty name
    if (!/^\d{6}$/.test(pin)) {
      setJoinError("Please enter a valid 6-digit Game PIN.");
      return;
    }

    if (!name) {
      setJoinError("Please enter your name.");
      return;
    }

    // ensure role set to student
    try { sessionStorage.setItem('cq_role','student'); } catch (e) {}

    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .select("id")
      .eq("game_pin", pin)
      .maybeSingle();

    if (quizError) {
      console.error("Join quiz error:", quizError);
      setJoinError("Unable to join quiz. Try again.");
      return;
    }

    if (!quizData?.id) {
      setJoinError("Invalid Game PIN");
      return;
    }

    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .insert([
        {
          quiz_id: quizData.id,
          name,
        },
      ])
      .select("id")
      .single();

    if (studentError) {
      console.error("Insert student error:", studentError);
      setJoinError("Unable to join quiz. Please try again.");
      return;
    }

    setCurrentStudentId(studentData?.id ?? null);
    setWaitingName(name);
    setWaitingQuizId(quizData.id);
    setStudentPin("");
    setStudentName("");
    setScreen("waiting");
  }

  useEffect(() => {
    if (screen !== "question") {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, currentQuestionIndex]);

  useEffect(() => {
    if (screen === "question") {
      setQuestionStartAt(Date.now());
      setAcceptingAnswers(true);
      setAnsweredQuestionIds([]);
    } else {
      setAcceptingAnswers(false);
    }
  }, [screen, currentQuestionIndex]);

  // watch countdown end
  useEffect(() => {
    if (screen !== "question") return;
    if (countdown > 0) return;

    // stop accepting answers
    setAcceptingAnswers(false);

    // if host, mark quiz as in review so leaderboard appears for everyone
    if (isHost && currentQuizId) {
      supabase.from("quizzes").update({ status: "review" }).eq("id", currentQuizId).then(({ error }) => {
        if (error) console.error("Failed to set review status:", error);
      });
    }

    // fetch leaderboard for this quiz
    const quizId = waitingQuizId || currentQuizId;
    if (quizId) fetchLeaderboard(quizId);
  }, [countdown, screen]);

  useEffect(() => {
    // restore role from sessionStorage on mount
    try {
      const role = sessionStorage.getItem('cq_role');
      if (role === 'host') setIsHost(true);
      if (role === 'student') setIsHost(false);
    } catch (e) {}

    if (!currentQuizId) {
      return;
    }

    let channel = supabase
      .channel(`students-count-${currentQuizId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "students",
          filter: `quiz_id=eq.${currentQuizId}`,
        },
        () => {
          setStudentsJoined((prev) => prev + 1);
        }
      )
      .subscribe();

    let pollInterval: any = null;

    async function fetchCount() {
      const { count, error } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("quiz_id", currentQuizId);

      if (!error) {
        setStudentsJoined(count ?? 0);
      }
    }

    fetchCount();
    // fallback poll every 2s for a short while to catch joins when realtime is not available
    pollInterval = setInterval(fetchCount, 2000);

    return () => {
      supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [currentQuizId]);

  async function loadQuestionsForQuiz(quizId: string) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, time_limit, question_order")
      .eq("quiz_id", quizId)
      .order("question_order", { ascending: true });

    if (error) {
      console.error("Failed to load questions:", error);
      return;
    }

    if (!data) return;

    const mapped = data.map((d: any) => ({
      id: d.id,
      question: d.question_text,
      options: [d.option_a, d.option_b, d.option_c, d.option_d],
      correct: ["A", "B", "C", "D"].indexOf(d.correct_answer),
    }));

    setQuestions(mapped);
  }

  async function submitAnswer(selectedIndex: number) {
    if (!currentQuizId || !currentStudentId) return;
    const current = questions[currentQuestionIndex];
    if (!current || !current.id) return;
    if (!acceptingAnswers) return;
    if (answeredQuestionIds.includes(current.id)) return;

    const now = Date.now();
    const startedAt = questionStartAt ?? now;
    const response_ms = Math.max(0, now - startedAt);
    const isCorrect = selectedIndex === current.correct;
    const selectedChar = ["A", "B", "C", "D"][selectedIndex] || "A";
    // deterministic scoring: faster correct answers get more points
    // base 1000, subtract 0.1 * ms, min 0
    let points = 0;
    if (isCorrect) {
      points = Math.max(0, Math.round(1000 - Math.floor(response_ms * 0.1)));
    }

    // insert answer (include response_time_ms if available in DB)
    try {
      const insertPayload: any = {
        quiz_id: currentQuizId,
        question_id: current.id,
        student_id: currentStudentId,
        answer: selectedChar,
        is_correct: isCorrect,
        points,
      };
      // include response_time_ms if column exists (safe to include)
      insertPayload.response_time_ms = response_ms;

      const { error } = await supabase.from("answers").insert([insertPayload]);
      if (error) {
        console.error("Insert answer error:", error);
      }

      const qId = current.id as string;
      setAnsweredQuestionIds((prev) => [...prev, qId]);
    } catch (e) {
      console.error("submitAnswer failed", e);
    }
  }

  async function fetchLeaderboard(quizId: string) {
    try {
      const [{ data: answers }, { data: students }] = await Promise.all([
        supabase.from("answers").select("student_id, points").eq("quiz_id", quizId),
        supabase.from("students").select("id,name").eq("quiz_id", quizId),
      ]);

      const scoreMap: Record<string, number> = {};
      (answers || []).forEach((a: any) => {
        const s = a.student_id;
        scoreMap[s] = (scoreMap[s] || 0) + (a.points || 0);
      });

      const list = (students || []).map((s: any) => ({ id: s.id, name: s.name, points: scoreMap[s.id] || 0 }));
      list.sort((a, b) => b.points - a.points);
      setLeaderboard(list);
    } catch (e) {
      console.error("Failed to fetch leaderboard", e);
    }
  }

  // Subscribe to quiz updates for students waiting or active quiz
  useEffect(() => {
    const quizId = waitingQuizId || currentQuizId;
    if (!quizId) return;

    const channel = supabase
      .channel(`quiz-updates-${quizId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quizzes", filter: `id=eq.${quizId}` },
        (payload) => {
          const newRow = (payload as any).new;
          if (!newRow) return;

          // When quiz becomes active
          if (newRow.status === "active") {
            const qIndex = typeof newRow.current_question === "number" ? newRow.current_question : 0;
            loadQuestionsForQuiz(quizId).then(() => {
              setCurrentQuestionIndex(qIndex);
              setCountdown(5);
              setQuestionStartAt(Date.now());
              setAcceptingAnswers(true);
              setScreen("question");
            });
            return;
          }

          // When quiz enters review (show leaderboard)
          if (newRow.status === "review") {
            // fetch leaderboard and show
            fetchLeaderboard(quizId).then(() => {
              setScreen("leaderboard");
            });
            return;
          }

          // When quiz finished
          if (newRow.status === "finished") {
            setScreen("complete");
            return;
          }

          // If current_question changed while active
          if (typeof newRow.current_question === "number" && newRow.current_question >= 0) {
            const qIndex = newRow.current_question;
            loadQuestionsForQuiz(quizId).then(() => {
              setCurrentQuestionIndex(qIndex);
              setCountdown(5);
              setQuestionStartAt(Date.now());
              setAcceptingAnswers(true);
              setScreen("question");
            });
          }
        }
      )
      .subscribe();

    // fetch initial state of quiz to handle immediate transitions
    let pollInterval: any = null;

    const checkInitial = async () => {
      // select status and current_question to avoid schema-cache issues
      const { data, error } = await supabase
        .from("quizzes")
        .select("status,current_question")
        .eq("id", quizId)
        .maybeSingle();

      if (error) {
        console.error('checkInitial error', error);
        return false;
      }
      if (!data) return false;

      if (data.status === "active") {
        const qIndex = typeof data.current_question === 'number' ? data.current_question : 0;
        await loadQuestionsForQuiz(quizId);
        setCurrentQuestionIndex(qIndex);
        setCountdown(5);
        setScreen("question");
        return true;
      }

      if (data.status === "review") {
        await fetchLeaderboard(quizId);
        setScreen("leaderboard");
        return true;
      }

      if (data.status === "finished") {
        setScreen("complete");
        return true;
      }

      return false;
    };

    // initial immediate check
    checkInitial().then((found) => {
      // continuous fallback: poll every 2s to catch status changes when realtime fails
      pollInterval = setInterval(async () => {
        const done = await checkInitial();
        if (done && pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }, 2000);
    });

    return () => {
      supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [waitingQuizId, currentQuizId]);

  // enforce role-based screen access: redirect away from host-only screens if not host
  useEffect(() => {
    const hostOnly = ["host", "create", "ready"];
    if (hostOnly.includes(screen) && !isHost) {
      setScreen("home");
    }
  }, [screen, isHost]);

  function deleteQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
  }

  async function handleHostNextQuestion() {
    if (!isHost) {
      console.warn('handleHostNextQuestion blocked: not host');
      return;
    }
    if (!currentQuizId) return;
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      // set quiz active and advance current_question
      const { error } = await supabase.from("quizzes").update({ status: "active", current_question: nextIndex }).eq("id", currentQuizId);
      if (error) {
        console.error("Failed to advance question:", error);
        return;
      }
      // host view will update via subscription; also set local state
      setCurrentQuestionIndex(nextIndex);
      setCountdown(5);
      setScreen("question");
      setQuestionStartAt(Date.now());
      setAcceptingAnswers(true);
    } else {
      // final -> finish
      const { error } = await supabase.from("quizzes").update({ status: "finished", current_question: -1 }).eq("id", currentQuizId);
      if (error) {
        console.error("Failed to finish quiz:", error);
        return;
      }
      setScreen("complete");
    }
  }

  if (screen === "create") {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
        <div className="max-w-5xl mx-auto">

          <button
            onClick={() => setScreen("host")}
            className="text-slate-300 mb-6"
          >
            ← Back to Host
          </button>

          <h1 className="text-4xl font-bold">
            Create Quiz 📝
          </h1>

          <p className="text-slate-400 mt-2">
            Add your multiple-choice questions.
          </p>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-8">

            <label className="block mb-2 text-slate-300">
              Quiz Name
            </label>

            <input
              value={quizName}
              onChange={(e) => setQuizName(e.target.value)}
              placeholder="Example: Interior Design Quiz"
              className="w-full bg-slate-800 rounded-xl p-4 outline-none"
            />

            <hr className="border-slate-700 my-8" />

            <h2 className="text-2xl font-bold">
              Question {questions.length + 1}
            </h2>

            <label className="block mt-6 mb-2">
              Question
            </label>

            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your question..."
              className="w-full bg-slate-800 rounded-xl p-4 h-28 outline-none"
            />

            <div className="grid md:grid-cols-2 gap-4 mt-6">

              {options.map((option, index) => (
                <input
                  key={index}
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...options];
                    newOptions[index] = e.target.value;
                    setOptions(newOptions);
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  className="bg-slate-800 rounded-xl p-4 outline-none"
                />
              ))}

            </div>

            <label className="block mt-6 mb-2">
              Correct Answer
            </label>

            <select
              value={correct}
              onChange={(e) => setCorrect(Number(e.target.value))}
              className="w-full bg-slate-800 rounded-xl p-4"
            >
              <option value={0}>A</option>
              <option value={1}>B</option>
              <option value={2}>C</option>
              <option value={3}>D</option>
            </select>

            <div className="mt-6 bg-slate-800 rounded-xl p-4">
              ⏱️ Timer: <strong>5 seconds</strong>
            </div>

            <button
              onClick={saveQuestion}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold"
            >
              + Add Question
            </button>

          </div>

          {questions.length > 0 && (
            <div className="mt-8">

              <h2 className="text-2xl font-bold mb-4">
                Questions ({questions.length})
              </h2>

              <div className="space-y-4">

                {questions.map((q, index) => (
                  <div
                    key={index}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
                  >

                    <div className="flex justify-between gap-4">

                      <div>
                        <p className="font-bold">
                          {index + 1}. {q.question}
                        </p>

                        <div className="grid md:grid-cols-2 gap-2 mt-3 text-slate-400">

                          {q.options.map((option, optionIndex) => (
                            <div key={optionIndex}>
                              {String.fromCharCode(65 + optionIndex)}.{" "}
                              {option}
                              {optionIndex === q.correct && (
                                <span className="text-green-400 ml-2">
                                  ✓ Correct
                                </span>
                              )}
                            </div>
                          ))}

                        </div>
                      </div>

                      <button
                        onClick={() => deleteQuestion(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>

                    </div>

                  </div>
                ))}

              </div>

              <button
                onClick={saveQuiz}
                className="w-full mt-6 bg-green-600 hover:bg-green-500 py-4 rounded-xl font-bold"
              >
                💾 Save Quiz
              </button>

            </div>
          )}

        </div>
      </main>
    );
  }

  if (screen === "ready") {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => setScreen("create")}
            className="text-slate-300 mb-6"
          >
            ← Back to Quiz Editor
          </button>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
            <div className="text-5xl">🏆</div>
            <h1 className="text-5xl font-black mt-4">QUIZ READY!</h1>
            <p className="text-slate-400 mt-4 text-lg">{quizName || "Untitled Quiz"}</p>

            <div className="mt-10 bg-slate-800 rounded-3xl p-8">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                GAME PIN
              </p>
              <p className="text-6xl font-black mt-4 tracking-[0.2em]">
                {gamePin}
              </p>
              <p className="text-slate-400 mt-4">Students can join using this PIN.</p>
            </div>

            <div className="mt-8 text-slate-200 text-lg">
              👥 Students Joined: {studentsJoined}
            </div>

            {isHost && (
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <button
                  onClick={startQuiz}
                  className="bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold"
                >
                  START QUIZ
                </button>
                <button
                  onClick={() => setScreen("create")}
                  className="bg-slate-800 border border-slate-700 py-4 rounded-2xl font-bold"
                >
                  EDIT QUESTIONS
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (screen === "waiting") {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <div className="text-5xl">⏳</div>
            <h1 className="text-4xl font-bold mt-4">Waiting for Host</h1>
            <p className="text-slate-400 mt-4 text-lg">Hi {waitingName}, your request was sent.</p>
            <p className="text-slate-400 mt-2">Waiting for the host to start the quiz.</p>
            <button
              onClick={() => setScreen("student")}
              className="w-full mt-8 bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl font-bold"
            >
              Back to Join
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (screen === "leaderboard") {
    const total = leaderboard.length;
    const myIndex = leaderboard.findIndex((l) => l.id === currentStudentId);
    const myRank = myIndex >= 0 ? myIndex + 1 : null;
    const myScore = myIndex >= 0 ? leaderboard[myIndex].points : 0;

    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-2xl text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <div className="text-5xl">📊</div>
            <h1 className="text-4xl font-bold mt-4">Leaderboard</h1>
            <p className="text-slate-400 mt-2">Results for Question {currentQuestionIndex + 1}</p>

            <div className="mt-6 space-y-3 text-left">
              {leaderboard.map((entry, idx) => (
                <div key={entry.id} className="bg-slate-800 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <span className="mr-3 font-bold">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}</span>
                    <span className="font-semibold">{entry.name}</span>
                  </div>
                  <div className="text-slate-300 font-bold">{entry.points}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-slate-300">
              {myRank ? (
                <div>
                  <div className="text-lg">Your Rank: <strong>{myRank}/{total}</strong></div>
                  <div className="text-lg">Your Score: <strong>{myScore}</strong></div>
                </div>
              ) : (
                <div className="text-lg">You are not ranked yet.</div>
              )}
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {isHost ? (
                <button onClick={handleHostNextQuestion} className="bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold">NEXT QUESTION</button>
              ) : (
                <div className="bg-slate-800 rounded-2xl py-4">Waiting for host to advance...</div>
              )}
              <button onClick={() => setScreen('home')} className="bg-slate-800 border border-slate-700 py-4 rounded-2xl font-bold">Back to Home</button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (screen === "complete") {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <div className="text-5xl">🏁</div>
            <h1 className="text-4xl font-bold mt-4">Quiz Complete</h1>
            <p className="text-slate-400 mt-4 text-lg">Thanks for playing!</p>
            <button
              onClick={() => setScreen("home")}
              className="w-full mt-8 bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (screen === "question") {
    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;

    return (
      <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => setScreen("ready")}
            className="text-slate-300 mb-6"
          >
            ← Back to Quiz Ready
          </button>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-slate-400 uppercase tracking-[0.3em] text-sm">
                  Question {currentQuestionIndex + 1} / {totalQuestions}
                </p>
                <h1 className="text-4xl font-bold mt-3">{currentQuestion.question}</h1>
              </div>
              <div className="text-center bg-slate-800 rounded-3xl p-6">
                <p className="text-sm text-slate-400">Countdown</p>
                <p className="text-6xl font-black mt-2">{countdown}</p>
              </div>
            </div>

            <div className="grid gap-4 mt-8">
              {currentQuestion.options.map((option, index) => {
                const qId = (currentQuestion as any).id;
                const already = qId ? answeredQuestionIds.includes(qId) : false;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (already) return;
                      if (!acceptingAnswers) return;
                      submitAnswer(index);
                    }}
                    disabled={already || !acceptingAnswers}
                    className={`text-left rounded-3xl p-5 ${already || !acceptingAnswers ? 'bg-slate-700' : 'bg-slate-800 hover:bg-slate-700'}`}
                  >
                    <span className="font-bold mr-3">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </button>
                );
              })}
            </div>

            {isHost && (
              <button
                onClick={handleHostNextQuestion}
                className="w-full mt-8 bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold"
              >
                Next Question
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (screen === "host") {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8">

        <div className="max-w-5xl mx-auto">

          <button
            onClick={() => setScreen("home")}
            className="text-slate-300 mb-8"
          >
            ← Back
          </button>

          <h1 className="text-4xl font-bold">
            Host Dashboard 👨‍🏫
          </h1>

          <div className="grid md:grid-cols-3 gap-5 mt-10">

            <button
              onClick={() => setScreen("create")}
              className="bg-blue-600 hover:bg-blue-500 rounded-2xl p-7 text-left"
            >
              <span className="text-4xl inline-block">📝</span>

              <span className="text-2xl font-bold mt-4 block">
                Create Quiz
              </span>

              <span className="text-blue-100 mt-2 block">
                Add your MCQ questions.
              </span>
            </button>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7">
              <span className="text-4xl inline-block">👥</span>

              <span className="text-2xl font-bold mt-4 block">
                Students
              </span>

              <span className="text-slate-400 mt-2 block">
                Students will join using a PIN.
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7">
              <span className="text-4xl inline-block">🏆</span>

              <span className="text-2xl font-bold mt-4 block">
                Leaderboard
              </span>

              <span className="text-slate-400 mt-2 block">
                Fast correct answers get more points.
              </span>
            </div>

          </div>

        </div>

      </main>
    );
  }

  if (screen === "student") {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">

        <div className="w-full max-w-md">

          <button
            onClick={() => setScreen("home")}
            className="mb-6 text-slate-300"
          >
            ← Back
          </button>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">

            <h1 className="text-3xl font-bold text-center">
              Join Quiz 🎮
            </h1>

            <label className="block mt-8 mb-2">
              Game PIN
            </label>

            <input
              value={studentPin}
              onChange={(e) => {
                // allow only digits and limit to 6 characters
                const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                setStudentPin(digits);
              }}
              inputMode="numeric"
              maxLength={6}
              placeholder="482913"
              className="w-full bg-slate-800 rounded-xl p-4 outline-none"
            />

            <label className="block mt-5 mb-2">
              Your Name
            </label>

            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-slate-800 rounded-xl p-4 outline-none"
            />

            {joinError && (
              <p className="mt-4 text-red-400">{joinError}</p>
            )}

            <button
              onClick={joinQuiz}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold"
            >
              Join Competition
            </button>

          </div>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">

      <div className="max-w-4xl w-full text-center">

        <div className="text-7xl">
          🏆
        </div>

        <h1 className="text-5xl md:text-6xl font-black mt-5">
          Classroom Quiz
        </h1>

        <p className="text-xl text-slate-400 mt-4">
          Fast answers. More points. Top the leaderboard.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-12">

          <button
            onClick={() => {
              setScreen("host");
              setIsHost(true);
              try { sessionStorage.setItem('cq_role','host'); } catch (e) {}
            }}
            className="bg-blue-600 hover:bg-blue-500 rounded-2xl p-8"
          >
            <div className="text-5xl">
              👨‍🏫
            </div>

            <h2 className="text-2xl font-bold mt-4">
              I'm the Host
            </h2>

            <p className="text-blue-100 mt-2">
              Create and control the competition.
            </p>
          </button>

          <button
            onClick={() => {
              setScreen("student");
              setIsHost(false);
              try { sessionStorage.setItem('cq_role','student'); } catch (e) {}
            }}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl p-8"
          >
            <div className="text-5xl">
              👨‍🎓
            </div>

            <h2 className="text-2xl font-bold mt-4">
              Join Quiz
            </h2>

            <p className="text-slate-400 mt-2">
              Enter your game PIN.
            </p>
          </button>

        </div>

      </div>

    </main>
  );
}