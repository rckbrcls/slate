import { useMemo } from "react"
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts"
import { motion } from "motion/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { ReadabilityResult } from "@/lib/analytics/readability"

interface ReadabilityTabProps {
  readability: ReadabilityResult | null
}

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

function getGradeColor(grade: number) {
  if (grade <= 6) return "var(--chart-4)" // green-ish
  if (grade <= 9) return "var(--chart-2)" // amber-ish
  return "var(--chart-5)" // red-ish
}

function getEaseColor(ease: number) {
  if (ease >= 60) return "var(--chart-4)"
  if (ease >= 30) return "var(--chart-2)"
  return "var(--chart-5)"
}

function getEaseLabel(ease: number) {
  if (ease >= 70) return "Very Easy"
  if (ease >= 60) return "Easy"
  if (ease >= 50) return "Standard"
  if (ease >= 30) return "Moderate"
  return "Complex"
}

function getGradeLabel(grade: number) {
  if (grade <= 4) return "Elementary"
  if (grade <= 6) return "Easy"
  if (grade <= 8) return "Standard"
  if (grade <= 10) return "Moderate"
  return "Advanced"
}

function getAssessment(score: { gradeLevel: number; readingEase: number; wordCount: number }) {
  if (score.readingEase >= 70) return "Speaks in short, punchy sentences — very accessible."
  if (score.readingEase >= 50) return "Natural conversational flow — good for most characters."
  if (score.readingEase >= 30) return "Somewhat complex speech — fits educated or formal characters."
  return "Dense, verbose dialogue — consider simplifying unless intentional."
}

export function ReadabilityTab({ readability }: ReadabilityTabProps) {
  const sortedChars = useMemo(() => {
    if (!readability) return []
    return Array.from(readability.perCharacter.entries())
      .sort(([, a], [, b]) => b.wordCount - a.wordCount)
      .slice(0, 10)
  }, [readability])

  if (!readability) {
    return (
      <p className="text-center text-xs text-muted-foreground py-8">
        No readability data
      </p>
    )
  }

  const { overall } = readability
  const gradeValue = Math.min(Math.max(overall.gradeLevel, 0), 16)
  const easeValue = Math.min(Math.max(overall.readingEase, 0), 100)

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Gauge Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
        {/* Grade Level Gauge */}
        <Card className="p-0">
          <CardContent className="px-3 py-3 flex flex-col items-center">
            <p className="text-[10px] text-muted-foreground mb-1">Grade Level</p>
            <div className="relative size-24">
              <RadialBarChart
                width={96}
                height={96}
                cx={48}
                cy={48}
                innerRadius={30}
                outerRadius={44}
                barSize={8}
                data={[{ value: gradeValue, fill: getGradeColor(gradeValue) }]}
                startAngle={180}
                endAngle={0}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 16]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  dataKey="value"
                  cornerRadius={4}
                  background={{ fill: "var(--muted)" }}
                />
              </RadialBarChart>
              <div className="absolute inset-0 flex items-center justify-center pt-2">
                <span className="text-lg font-bold">{overall.gradeLevel}</span>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="text-[10px] mt-1"
              style={{ color: getGradeColor(gradeValue) }}
            >
              {getGradeLabel(overall.gradeLevel)}
            </Badge>
          </CardContent>
        </Card>

        {/* Reading Ease Gauge */}
        <Card className="p-0">
          <CardContent className="px-3 py-3 flex flex-col items-center">
            <p className="text-[10px] text-muted-foreground mb-1">Reading Ease</p>
            <div className="relative size-24">
              <RadialBarChart
                width={96}
                height={96}
                cx={48}
                cy={48}
                innerRadius={30}
                outerRadius={44}
                barSize={8}
                data={[{ value: easeValue, fill: getEaseColor(easeValue) }]}
                startAngle={180}
                endAngle={0}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  dataKey="value"
                  cornerRadius={4}
                  background={{ fill: "var(--muted)" }}
                />
              </RadialBarChart>
              <div className="absolute inset-0 flex items-center justify-center pt-2">
                <span className="text-lg font-bold">{overall.readingEase}</span>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="text-[10px] mt-1"
              style={{ color: getEaseColor(easeValue) }}
            >
              {getEaseLabel(overall.readingEase)}
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      {/* Explainer */}
      <motion.div variants={fadeUp}>
        <Card className="p-0">
          <CardContent className="px-4 py-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong>Flesch-Kincaid</strong> measures how accessible your dialogue is.
              Screenplays typically score <strong>grade 3–6</strong> (reading ease 60+)
              — conversational, punchy, and easy to follow. Higher grades may suit
              intellectual or period characters.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      {/* Per-Character Horizontal Bars */}
      {sortedChars.length > 0 && (
        <motion.div variants={fadeUp}>
          <p className="text-xs font-medium text-muted-foreground mb-3">
            Per Character Readability
          </p>
          <div className="space-y-2">
            {sortedChars.map(([name, score]) => {
              const easeNorm = Math.min(Math.max(score.readingEase, 0), 100)
              return (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-[10px] font-medium w-20 truncate shrink-0">
                    {name}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${easeNorm}%`,
                        backgroundColor: getEaseColor(score.readingEase),
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">
                    {score.readingEase}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Character Detail Accordion */}
      {sortedChars.length > 0 && (
        <motion.div variants={fadeUp}>
          <Separator className="my-1" />
          <Accordion type="single" collapsible className="w-full">
            {sortedChars.map(([name, score]) => (
              <AccordionItem key={name} value={name}>
                <AccordionTrigger className="py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{name}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      Grade {score.gradeLevel}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      Ease {score.readingEase}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground pb-3">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <span className="text-[10px]">Words: </span>
                      <span className="font-medium text-foreground">
                        {score.wordCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px]">Sentences: </span>
                      <span className="font-medium text-foreground">
                        {score.sentenceCount}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] italic">{getAssessment(score)}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      )}
    </motion.div>
  )
}
