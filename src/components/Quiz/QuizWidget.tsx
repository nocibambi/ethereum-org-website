// Import libraries
import React, { useEffect, useState, useMemo, useCallback } from "react"
import {
  Box,
  ButtonGroup,
  Center,
  Circle,
  Container,
  Flex,
  Heading,
  Icon,
  Text,
  Spinner,
} from "@chakra-ui/react"
import { shuffle } from "lodash"
import { FaTwitter } from "react-icons/fa"

// Import components
import Button from "../Button"
import QuizRadioGroup from "./QuizRadioGroup"
import QuizSummary from "./QuizSummary"

// Import SVGs
import Trophy from "../../assets/quiz/trophy.svg"
import Correct from "../../assets/quiz/correct.svg"
import Incorrect from "../../assets/quiz/incorrect.svg"
import StarConfetti from "../../assets/quiz/star-confetti.svg"

// Import data
import allQuizData from "../../data/quizzes"
import questionBank from "../../data/quizzes/questionBank"

// Import utilities
import { trackCustomEvent } from "../../utils/matomo"

// Import types
import { AnswerChoice, RawQuiz, Quiz, RawQuestion, Question } from "../../types"

// Import constants
import { PASSING_QUIZ_SCORE } from "../../constants"

// Interfaces
export interface IProps {
  quizKey?: string
  maxQuestions?: number
}

// Component
const QuizWidget: React.FC<IProps> = ({ quizKey, maxQuestions }) => {
  const [quizData, setQuizData] = useState<Quiz | null>(null)
  const [userQuizProgress, setUserQuizProgress] = useState<Array<AnswerChoice>>(
    []
  )
  const [showAnswer, setShowAnswer] = useState<boolean>(false)
  const [currentQuestionAnswerChoice, setCurrentQuestionAnswerChoice] =
    useState<AnswerChoice | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

  const initialize = (): void => {
    // Reset state
    setQuizData(null)
    setCurrentQuestionAnswerChoice(null)
    setUserQuizProgress([])
    setShowAnswer(false)
    setSelectedAnswer(null)

    // Get quiz key
    const currentQuizKey =
      quizKey ||
      Object.keys(allQuizData).filter((quizUri) =>
        window?.location.href.includes(quizUri)
      )[0] ||
      null

    if (!currentQuizKey) return

    // Get quiz data from key, shuffle, then truncate if necessary
    const rawQuiz: RawQuiz = allQuizData[currentQuizKey]
    const questions: Array<Question> = rawQuiz.questions.map((id) => {
      const rawQuestion: RawQuestion = questionBank[id]
      return { id, ...rawQuestion }
    })
    const shuffledQuestions = shuffle(questions)
    const trimmedQuestions = maxQuestions
      ? shuffledQuestions.slice(0, maxQuestions)
      : shuffledQuestions
    const quiz: Quiz = { title: rawQuiz.title, questions: trimmedQuestions }
    setQuizData(quiz)
  }
  useEffect(initialize, [quizKey])

  // Memoized values
  const currentQuestionIndex = useMemo<number>(
    () => userQuizProgress.length || 0,
    [userQuizProgress]
  )

  const showResults = useMemo<boolean>(
    () => userQuizProgress.length === quizData?.questions.length,
    [userQuizProgress, quizData]
  )

  const progressBarBackground = useCallback(
    (index: number): string => {
      if (
        (showAnswer &&
          index === currentQuestionIndex &&
          currentQuestionAnswerChoice?.isCorrect) ||
        userQuizProgress[index]?.isCorrect
      )
        return "success"
      if (
        (showAnswer &&
          index === currentQuestionIndex &&
          !currentQuestionAnswerChoice?.isCorrect) ||
        (userQuizProgress[index] && !userQuizProgress[index].isCorrect)
      )
        return "error"
      if (index === currentQuestionIndex) return "gray.400"
      return "gray.500"
    },
    [
      showAnswer,
      currentQuestionIndex,
      currentQuestionAnswerChoice,
      userQuizProgress,
    ]
  )

  const correctCount = useMemo<number>(
    () => userQuizProgress.filter(({ isCorrect }) => isCorrect).length,
    [userQuizProgress]
  )

  const ratioCorrect = useMemo<number>(
    () => (!quizData ? 0 : correctCount / quizData.questions.length),
    [quizData, correctCount]
  )

  const score = useMemo<number>(
    () => Math.floor(ratioCorrect * 100),
    [ratioCorrect]
  )

  const isPassingScore = useMemo<boolean>(
    () => score > PASSING_QUIZ_SCORE,
    [score]
  )

  const showConfetti = useMemo<boolean>(
    () => !!quizData && showResults && isPassingScore,
    [quizData, showResults, isPassingScore]
  )

  // Handlers
  const handleSelectAnswerChoice = (answerId: string): void => {
    const isCorrect =
      answerId === quizData?.questions[currentQuestionIndex].correctAnswerId
    setCurrentQuestionAnswerChoice({ answerId, isCorrect })
  }

  const handleSelection = (answerId: string): void => {
    setSelectedAnswer(answerId)
    handleSelectAnswerChoice(answerId)
  }

  const handleShowAnswer = (questionId: string, answer: AnswerChoice): void => {
    trackCustomEvent({
      eventCategory: "Quiz widget",
      eventAction: "Question answered",
      eventName: `QID: ${questionId}`,
      eventValue: answer.isCorrect
        ? `Correct answer`
        : `AID: ${answer.answerId}`,
    })
    setShowAnswer(true)
  }

  const handleRetryQuestion = (): void => {
    trackCustomEvent({
      eventCategory: "Quiz widget",
      eventAction: "Other",
      eventName: "Retry question",
    })
    setCurrentQuestionAnswerChoice(null)
    setSelectedAnswer(null)
    setShowAnswer(false)
  }

  const handleContinue = (): void => {
    if (!currentQuestionAnswerChoice) return
    setUserQuizProgress((prev) => [...prev, currentQuestionAnswerChoice])
    setCurrentQuestionAnswerChoice(null)
    setShowAnswer(false)
    if (showResults) {
      trackCustomEvent({
        eventCategory: "Quiz widget",
        eventAction: "Other",
        eventName: "Submit results",
        eventValue: `${score}%`,
      })
    }
  }

  const handleShare = (): void => {
    if (!quizData || !window) return
    trackCustomEvent({
      eventCategory: "Quiz widget",
      eventAction: "Other",
      eventName: "Share results",
    })
    const url = `https://ethereum.org${window.location.pathname}` // TODO: Add hash link to quiz
    const tweet = `I just took the "${quizData.title}" quiz on ethereum.org and scored ${correctCount} out of ${quizData.questions.length}! Try it yourself at ${url}`
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURI(
        tweet
      )}&hashtags=${"ethereumknowledge"}`
    )
  }

  // TODO: Allow user to submit quiz for storage
  // TODO: Fix a11y keyboard tab stops

  // Render QuizWidget component
  return (
    <Flex width="full" direction="column" alignItems="center">
      <Heading
        as="h2"
        mb={12}
        id="quiz"
        scrollBehavior="smooth"
        scrollMarginTop={24}
      >
        Test your knowledge
      </Heading>
      <Box
        w="full"
        maxW="600px"
        bg={
          !showAnswer
            ? "neutral"
            : currentQuestionAnswerChoice?.isCorrect
            ? "successNeutral"
            : "errorNeutral"
        }
        borderRadius="base"
        boxShadow="drop"
        py={{ base: 5, md: 12 }}
        px={{ base: 7, md: 15 }}
        position="relative"
      >
        {/* Trophy icon */}
        <Circle
          size="50px"
          bg={
            !showAnswer
              ? "primary"
              : currentQuestionAnswerChoice?.isCorrect
              ? "success"
              : "error"
          }
          position="absolute"
          top={0}
          left="50%"
          transform="translateX(-50%) translateY(-50%)"
        >
          <Icon
            as={
              !showAnswer
                ? Trophy
                : currentQuestionAnswerChoice?.isCorrect
                ? Correct
                : Incorrect
            }
            fontSize="1.75rem"
            color="neutral"
          />
        </Circle>
        {showConfetti && (
          <>
            <Icon
              as={StarConfetti}
              fontSize="184px"
              position="absolute"
              left={0}
              top={-8}
            />
            <Icon
              as={StarConfetti}
              fontSize="184px"
              position="absolute"
              right={0}
              top={-8}
              transform="scaleX(-100%)"
            />
          </>
        )}
        {quizData ? (
          <>
            <Center>
              <Text fontStyle="normal" fontWeight="700" color="primaryHover">
                {quizData.title}
              </Text>
            </Center>
            {/* Progress bar */}
            <Center gap={1} marginBottom={6}>
              {quizData.questions.map(({ id }, index) => (
                <Container
                  key={id}
                  bg={progressBarBackground(index)}
                  h="4px"
                  maxW="2rem" // TODO: Improve responsiveness for more questions on smaller screens
                  width="full"
                  marginInline={0}
                />
              ))}
            </Center>
            <Center>
              {showResults ? (
                <QuizSummary
                  correctCount={correctCount}
                  questionCount={quizData.questions.length}
                />
              ) : (
                <QuizRadioGroup
                  questionData={quizData.questions[currentQuestionIndex]}
                  showAnswer={showAnswer}
                  handleSelection={handleSelection}
                  selectedAnswer={selectedAnswer}
                />
              )}
            </Center>
            <Center mt={8}>
              <ButtonGroup gap={6}>
                {showAnswer &&
                  currentQuestionAnswerChoice &&
                  !currentQuestionAnswerChoice.isCorrect && (
                    <Button
                      onClick={handleRetryQuestion}
                      variant={"outline-color"}
                    >
                      Try again
                    </Button>
                  )}
                {showResults ? (
                  <Flex gap={6}>
                    <Button
                      leftIcon={<Icon as={FaTwitter} />}
                      onClick={handleShare}
                    >
                      Share results
                    </Button>
                    <Button onClick={initialize}>Take quiz again</Button>
                  </Flex>
                ) : showAnswer ? (
                  <Button onClick={handleContinue}>
                    {userQuizProgress.length === quizData.questions.length - 1
                      ? "See results"
                      : "Next question"}
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      handleShowAnswer(
                        quizData.questions[currentQuestionIndex].id,
                        currentQuestionAnswerChoice!
                      )
                    }
                    disabled={!currentQuestionAnswerChoice}
                  >
                    Submit answer
                  </Button>
                )}
              </ButtonGroup>
            </Center>
          </>
        ) : (
          <Flex justify="center">
            <Spinner />
          </Flex>
        )}
      </Box>
    </Flex>
  )
}

export default QuizWidget
