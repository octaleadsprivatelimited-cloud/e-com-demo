"use client"

import * as React from "react"
import { Field as FieldPrimitive } from "@base-ui/react/field"
import { Fieldset as FieldsetPrimitive } from "@base-ui/react/fieldset"
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"
import { cn } from "@/lib/utils"

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof FieldPrimitive.Root> & {
  orientation?: "horizontal" | "vertical"
}) {
  return (
    <FieldPrimitive.Root
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        "flex gap-1.5",
        orientation === "horizontal" ? "flex-row items-center" : "flex-col",
        className
      )}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof FieldPrimitive.Label>) {
  return (
    <FieldPrimitive.Label
      data-slot="field-label"
      className={cn(
        "text-sm font-medium text-foreground select-none group-data-[disabled]:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function FieldDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function FieldGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function FieldSet({
  className,
  ...props
}: React.ComponentProps<typeof FieldsetPrimitive.Root>) {
  return (
    <FieldsetPrimitive.Root
      data-slot="fieldset"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  ...props
}: React.ComponentProps<typeof FieldsetPrimitive.Legend>) {
  return (
    <FieldsetPrimitive.Legend
      data-slot="field-legend"
      className={cn("text-sm font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  )
}

function FieldSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      data-slot="field-separator"
      className={cn("h-px w-full bg-border", className)}
      {...props}
    />
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldSeparator,
}
