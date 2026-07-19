import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useGetQuiz, 
  useSubmitQuiz,
  getGetQuizQueryKey
} from "@workspace/api-client-react/api";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { 
  ArrowLeft, Clock, AlertCircle, CheckCircle2, XCircle, Brain
} from "lucide-react";

export default function QuizPlayer() {
  const { courseId, quizId } = useParams<{ courseId: string, quizId: string }>();
  const id = parseInt(quizId || "0", 10);
  const cId = parseInt(courseId || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data: quiz, isLoading } = useGetQuiz(id, {
    query: { enabled: !!id, queryKey: getGetQuizQueryKey(id) }
  });

  const submitMutation = useSubmitQuiz({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        setIsSubmitted(true);
        toast({ title: "Quiz submitted!" });
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: err.message || "Could not submit quiz."
        });
      }
    }
  });

  // Timer logic
  useEffect(() => {
    if (quiz?.timeLimit && timeLeft === null && !isSubmitted) {
      setTimeLeft(quiz.timeLimit * 60);
      return;
    }

    if (timeLeft !== null && timeLeft > 0 && !isSubmitted) {
      const timer = setInterval(() => setTimeLeft(prev => (prev || 1) - 1), 1000);
      return () => clearInterval(timer);
    }

    if (timeLeft === 0 && !isSubmitted) {
      handleSubmit(); // Auto-submit when time is up
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, timeLeft, isSubmitted]);

  const handleOptionSelect = (questionId: number, optionId: string) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = () => {
    if (!quiz || isSubmitted) return;
    const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
      questionId: parseInt(qId, 10),
      answer: ans
    }));
    
    // In a real app we might validate all questions are answered, but let's allow partial for now
    submitMutation.mutate({ quizId: id, data: { answers: formattedAnswers } });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isLoading) return <AppLayout><div className="flex h-[50vh] items-center justify-center"><div className="animate-pulse w-16 h-16 rounded-full bg-primary/20" /></div></AppLayout>;
  if (!quiz) return <AppLayout>Quiz not found</AppLayout>;

  const questions = quiz.questions || [];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = (answeredCount / questions.length) * 100;

  if (isSubmitted && result) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto space-y-8 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/learn/${cId}`}><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <h1 className="text-3xl font-bold font-serif">Quiz Results</h1>
          </div>

          <Card className={`border-2 ${result.passed ? 'border-green-500/50' : 'border-destructive/50'}`}>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 text-3xl
                ${result.passed ? 'bg-green-500/20 text-green-500' : 'bg-destructive/20 text-destructive'}">
                {result.passed ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
              </div>
              <CardTitle className="text-3xl font-serif">
                {result.passed ? "Congratulations!" : "Keep Trying!"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-xl text-muted-foreground">
                You scored <span className="font-bold text-foreground">{result.score}%</span>
              </p>
              <div className="flex justify-center gap-8 text-sm">
                <div>
                  <div className="text-muted-foreground">Points Earned</div>
                  <div className="text-2xl font-bold">{result.earnedPoints} / {result.totalPoints}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Passing Score</div>
                  <div className="text-2xl font-bold">{quiz.passingScore}%</div>
                </div>
              </div>
              <div className="pt-6">
                <Button size="lg" asChild>
                  <Link href={`/learn/${cId}`}>Return to Course</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 mt-12">
            <h3 className="text-xl font-bold font-serif">Review Answers</h3>
            {questions.map((q, i) => {
              const answerResult = result.answers?.find((a: any) => a.questionId === q.id);
              const isCorrect = answerResult?.isCorrect;
              const userAnswer = answers[q.id];
              
              return (
                <Card key={q.id} className={isCorrect ? 'border-green-500/20' : 'border-destructive/20'}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 shrink-0">
                        {isCorrect ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-destructive" />}
                      </div>
                      <CardTitle className="text-base leading-relaxed">
                        {i + 1}. {q.text}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pl-14">
                    {q.options?.map((opt) => {
                      const isSelected = userAnswer === opt.id;
                      const isActualCorrect = opt.isCorrect; // Assuming the API might return this on results
                      
                      let bgClass = "bg-card border";
                      if (isSelected && isCorrect) bgClass = "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400";
                      else if (isSelected && !isCorrect) bgClass = "bg-destructive/10 border-destructive/30 text-destructive";
                      else if (!isSelected && isActualCorrect) bgClass = "bg-green-500/5 border-green-500/20"; // Highlight missed correct answer
                      
                      return (
                        <div key={opt.id} className={`p-3 rounded-lg text-sm ${bgClass}`}>
                          {opt.text}
                          {isSelected && <span className="float-right text-xs font-medium opacity-70">Your Answer</span>}
                        </div>
                      );
                    })}
                    {q.explanation && (
                      <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground border">
                        <span className="font-semibold text-foreground">Explanation:</span> {q.explanation}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/learn/${cId}`}><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-serif">{quiz.title}</h1>
              <p className="text-sm text-muted-foreground">{questions.length} questions • Passing score: {quiz.passingScore}%</p>
            </div>
          </div>
          
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-lg border
              ${timeLeft < 60 ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse' : 'bg-card'}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-6 shrink-0">
          <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
            <span>{answeredCount} of {questions.length} answered</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Questions list */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-6">
          {questions.map((q, index) => (
            <Card key={q.id} className="scroll-mt-4" id={`question-${q.id}`}>
              <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-lg leading-relaxed flex gap-3">
                  <span className="text-primary">{index + 1}.</span> {q.text}
                </CardTitle>
                <div className="text-xs text-muted-foreground pt-1">{q.points || 1} points</div>
              </CardHeader>
              <CardContent className="pt-6">
                <RadioGroup 
                  value={answers[q.id] || ""} 
                  onValueChange={(val) => handleOptionSelect(q.id, val)}
                  className="space-y-3"
                >
                  {q.options?.map((opt) => (
                    <div key={opt.id} className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer
                      ${answers[q.id] === opt.id ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-muted'}`}>
                      <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} />
                      <Label htmlFor={`opt-${opt.id}`} className="flex-1 cursor-pointer font-normal text-base">
                        {opt.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t shrink-0 flex items-center justify-between bg-background">
          <div className="text-sm text-muted-foreground hidden sm:block">
            {answeredCount < questions.length ? (
              <span className="flex items-center text-amber-500"><AlertCircle className="w-4 h-4 mr-1" /> {questions.length - answeredCount} questions remaining</span>
            ) : (
              <span className="flex items-center text-green-500"><CheckCircle2 className="w-4 h-4 mr-1" /> All questions answered</span>
            )}
          </div>
          <Button 
            size="lg" 
            onClick={handleSubmit} 
            disabled={submitMutation.isPending}
            className="w-full sm:w-auto px-8 font-bold"
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Quiz"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
