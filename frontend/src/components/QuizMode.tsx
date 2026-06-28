import React, { useState, useEffect } from 'react';
import { requestApi } from '../utils/api';
import { Award, BookOpen, Clock, Play, RotateCcw, Send, CheckCircle2, ShieldCheck } from 'lucide-react';

interface QuizModeProps {
  apiConnected: boolean | null;
}

export const QuizMode: React.FC<QuizModeProps> = ({ apiConnected }) => {
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currQ, setCurrQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [username, setUsername] = useState('NetAdmin');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [isFinished, setIsFinished] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);

  // Static fallback questions if backend is offline
  const fallbackQuestions = [
    {
      id: 1,
      question: "What is the network address for 192.168.1.50/26?",
      choices: ["192.168.1.0", "192.168.1.32", "192.168.1.64", "192.168.1.48"],
      correct: "192.168.1.0"
    },
    {
      id: 2,
      question: "How many usable host IP addresses are available in a /28 network?",
      choices: ["14", "16", "30", "6"],
      correct: "14"
    },
    {
      id: 3,
      question: "Which class does the IP address 172.16.0.1 belong to?",
      choices: ["Class A", "Class B", "Class C", "Class D"],
      correct: "Class B"
    },
    {
      id: 4,
      question: "What is the subnet mask representation of a /30 network?",
      choices: ["255.255.255.240", "255.255.255.252", "255.255.255.248", "255.255.255.0"],
      correct: "255.255.255.252"
    },
    {
      id: 5,
      question: "Find the broadcast address for the network 10.0.0.0/29.",
      choices: ["10.0.0.7", "10.0.0.15", "10.0.0.8", "10.0.0.255"],
      correct: "10.0.0.7"
    }
  ];

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      if (apiConnected) {
        const data = await requestApi('/quiz/questions?count=5', 'GET');
        setQuestions(data);
      } else {
        setQuestions(shuffleArray([...fallbackQuestions]));
      }
    } catch (e) {
      setQuestions(shuffleArray([...fallbackQuestions]));
    } finally {
      setLoading(false);
    }
  };

  const shuffleArray = (arr: any[]) => {
    return arr.sort(() => Math.random() - 0.5);
  };

  const fetchLeaderboard = async () => {
    try {
      if (apiConnected) {
        const data = await requestApi('/quiz/leaderboard?limit=8', 'GET');
        setLeaderboard(data);
      } else {
        // Fetch from local storage
        const local = localStorage.getItem('netcalc_leaderboard');
        if (local) setLeaderboard(JSON.parse(local));
      }
    } catch (e) {
      console.warn("Could not fetch leaderboard", e);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [apiConnected, quizStarted, isFinished]);

  // Timer effect
  useEffect(() => {
    if (!quizStarted || isFinished || isAnswered) return;
    if (timer === 0) {
      handleAnswerSelect(""); // force timeout
      return;
    }
    const id = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(id);
  }, [timer, quizStarted, isFinished, isAnswered]);

  const handleStart = () => {
    setScore(0);
    setCurrQ(0);
    setIsFinished(false);
    setScoreSaved(false);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setTimer(30);
    fetchQuestions().then(() => {
      setQuizStarted(true);
    });
  };

  const handleAnswerSelect = (choice: string) => {
    if (isAnswered) return;
    setSelectedAnswer(choice);
    setIsAnswered(true);
    if (choice === questions[currQ].correct) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currQ < questions.length - 1) {
      setCurrQ(currQ + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimer(30);
    } else {
      setIsFinished(true);
    }
  };

  const handleSaveScore = async () => {
    if (!username.trim()) return;
    try {
      if (apiConnected) {
        await requestApi('/quiz/scores', 'POST', {
          username,
          score,
          total: questions.length
        });
      } else {
        // Save to local storage
        const newScoreObj = {
          id: Date.now(),
          username,
          score,
          total: questions.length,
          percentage: (score / questions.length) * 100,
          timestamp: new Date().toISOString()
        };
        const local = localStorage.getItem('netcalc_leaderboard');
        const board = local ? JSON.parse(local) : [];
        board.push(newScoreObj);
        board.sort((a: any, b: any) => b.percentage - a.percentage || b.score - a.score);
        localStorage.setItem('netcalc_leaderboard', JSON.stringify(board.slice(0, 10)));
        setLeaderboard(board.slice(0, 10));
      }
      setScoreSaved(true);
      fetchLeaderboard();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header section */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Award className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white m-0">CCNA Subnetting Training Ground</h2>
            <p className="text-xs text-gray-400">Gamified quiz mode with real-time scoring and leaderboards to master subnet address math.</p>
          </div>
        </div>

        {!quizStarted && (
          <button
            onClick={handleStart}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20 text-sm flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Start Training
          </button>
        )}
      </div>

      {!quizStarted ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Instructions */}
          <div className="md:col-span-2 glass-panel rounded-2xl p-6 space-y-4 text-left">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 m-0">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Rules & Setup
            </h3>
            <ul className="space-y-3 text-xs text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>**Timed Questions:** You have 30 seconds to solve each network address calculation.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>**Immediate Feedback:** You will see the correct answers highlighted immediately.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>**Leaderboard Rank:** Submit your alias on quiz completion to record your rank.</span>
              </li>
            </ul>
          </div>

          {/* Leaderboard */}
          <div className="md:col-span-1 glass-panel rounded-2xl p-6 space-y-4 text-left">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 m-0">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> High Scores
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {leaderboard.length > 0 ? (
                leaderboard.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-900/60 border border-gray-800 rounded-xl px-3 py-2 text-xs font-mono">
                    <span className="text-gray-300 truncate w-24">#{idx + 1} {item.username}</span>
                    <span className="text-indigo-400 font-bold">{item.score}/{item.total} ({Math.round(item.percentage)}%)</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 text-center py-6">No high scores yet!</div>
              )}
            </div>
          </div>
        </div>
      ) : isFinished ? (
        /* Quiz Finished View */
        <div className="glass-panel rounded-2xl p-8 max-w-md mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto glow-border">
            <Award className="w-10 h-10 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Quiz Completed!</h2>
            <p className="text-sm text-gray-400 mt-1">
              You scored <span className="text-white font-bold">{score}</span> out of <span className="text-white font-bold">{questions.length}</span> (
              <span className="text-indigo-400 font-bold">{Math.round((score / questions.length) * 100)}%</span>)
            </p>
          </div>

          {!scoreSaved ? (
            <div className="space-y-3">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Alias"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-center text-sm font-mono"
              />
              <button
                onClick={handleSaveScore}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                <Send className="w-4 h-4" /> Save Score to Leaderboard
              </button>
            </div>
          ) : (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-medium">
              Score Saved Successfully!
            </div>
          )}

          <button
            onClick={handleStart}
            className="w-full bg-gray-850 hover:bg-gray-800 border border-gray-850 hover:border-gray-700 text-gray-300 font-medium py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
        </div>
      ) : (
        /* Quiz Active Question View */
        <div className="glass-panel rounded-2xl p-6 text-left space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider font-mono">
              Question {currQ + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-xs font-mono text-gray-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{timer}s</span>
            </div>
          </div>

          {questions.length > 0 && (
            <div className="space-y-6">
              <p className="text-base font-semibold text-white">{questions[currQ].question}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-sm">
                {questions[currQ].choices.map((choice: string, idx: number) => {
                  const isSelected = selectedAnswer === choice;
                  const isCorrectChoice = choice === questions[currQ].correct;
                  
                  let buttonStyle = "bg-gray-900 border-gray-850 text-gray-300 hover:border-indigo-500/40";
                  if (isAnswered) {
                    if (isCorrectChoice) {
                      buttonStyle = "bg-emerald-950/40 border-emerald-500/30 text-emerald-400";
                    } else if (isSelected) {
                      buttonStyle = "bg-red-950/40 border-red-500/30 text-red-400";
                    } else {
                      buttonStyle = "bg-gray-900 border-gray-850 text-gray-500 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelect(choice)}
                      disabled={isAnswered}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between ${buttonStyle}`}
                    >
                      <span>{choice === "" ? "[Timeout]" : choice}</span>
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleNext}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2 rounded-xl transition-all duration-200 text-sm"
                  >
                    {currQ === questions.length - 1 ? "Finish Quiz" : "Next Question"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
