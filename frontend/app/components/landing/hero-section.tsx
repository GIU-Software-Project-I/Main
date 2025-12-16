"use client"

import Link from 'next/link'
import { ArrowRight, Play, Star } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { DotPattern } from '@/app/components/dot-pattern'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-background/80 pt-20 sm:pt-32 pb-16">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        {/* Dot pattern overlay using reusable component */}
        <DotPattern className="opacity-100" size="md" fadeStyle="ellipse" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="mx-auto max-w-4xl text-center">
          {/* Announcement Badge */}
          <div className="mb-8 flex justify-center">
            <Badge variant="outline" className="px-4 py-2 border-foreground/20 bg-background/50 backdrop-blur-sm">
              <Star className="w-3 h-3 mr-2 fill-primary text-primary" />
              Smart HR Management System
              <ArrowRight className="w-3 h-3 ml-2" />
            </Badge>
          </div>

          {/* Main Headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Shape Tomorrow's
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {" "}Leaders{" "}
            </span>
          </h1>

          {/* Arabic Headline */}
          <h2 className="mb-8 text-3xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent leading-tight py-2">
            شايف نفسك فين بعد خمس سنين؟
          </h2>

          {/* Subheading */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Empower your organization to discover, develop, and retain top talent. Our comprehensive HR platform
            helps employees envision their future while enabling managers to guide them on their journey.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="text-base cursor-pointer h-12 px-8" asChild>
              <Link href="/dashboard">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-base cursor-pointer h-12 px-8" asChild>
              <Link href="#features">
                <Play className="mr-2 h-4 w-4" />
                Learn More
              </Link>
            </Button>
          </div>
        </div>

        {/* Hero Image/Visual */}
        <div className="mx-auto mt-20 max-w-6xl">
          <div className="relative group">
            {/* Top background glow effect - positioned above the image */}
            <div className="absolute top-2 lg:-top-8 left-1/2 transform -translate-x-1/2 w-[90%] mx-auto h-24 lg:h-80 bg-primary/20 rounded-full blur-3xl"></div>

            <div className="relative rounded-xl border bg-card shadow-2xl overflow-hidden min-h-[400px] flex items-center justify-center bg-gradient-to-br from-card to-muted/50">
              {/* Placeholder for Dashboard Image */}
              <div className="text-center p-10">
                <div className="mb-4 inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary">
                  <Star className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Dashboard Preview</h3>
                <p className="text-muted-foreground">Interactive HR Dashboard Interface</p>
              </div>

              {/* Bottom fade effect - gradient overlay that fades the image to background */}
              <div className="absolute bottom-0 left-0 w-full h-32 md:h-40 lg:h-48 bg-gradient-to-b from-background/0 via-background/70 to-background rounded-b-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

