"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function AttachmentGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-group"
      className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3", className)}
      {...props}
    />
  )
}

function Attachment({
  className,
  orientation = "horizontal",
  state = "default",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical"
  state?: "default" | "uploading" | "error"
}) {
  return (
    <div
      data-slot="attachment"
      data-orientation={orientation}
      data-state={state}
      className={cn(
        "relative flex border border-border bg-card text-card-foreground rounded-lg transition-all overflow-hidden shadow-sm hover:shadow-md",
        orientation === "horizontal"
          ? "flex-row items-center gap-3 p-3"
          : "flex-col items-stretch p-3 gap-2",
        state === "uploading" && "opacity-75 bg-muted/20 border-primary/20",
        state === "error" && "border-destructive/30 bg-destructive/5 text-destructive-foreground",
        className
      )}
      {...props}
    />
  )
}

function AttachmentMedia({
  className,
  variant = "icon",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "icon" | "image"
}) {
  return (
    <div
      data-slot="attachment-media"
      data-variant={variant}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md bg-muted overflow-hidden",
        variant === "icon"
          ? "size-10 text-muted-foreground [&_svg]:size-5 [&_img]:size-full [&_img]:object-cover"
          : "aspect-video w-full [&_img]:w-full [&_img]:h-full [&_img]:object-cover",
        className
      )}
      {...props}
    />
  )
}

function AttachmentContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-content"
      className={cn("flex flex-col flex-1 min-w-0 gap-0.5", className)}
      {...props}
    />
  )
}

function AttachmentTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="attachment-title"
      className={cn("text-sm font-semibold truncate text-foreground", className)}
      {...props}
    />
  )
}

function AttachmentDescription({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="attachment-description"
      className={cn("text-xs text-muted-foreground truncate", className)}
      {...props}
    />
  )
}

function AttachmentActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-actions"
      className={cn("flex items-center gap-1 shrink-0 ml-auto", className)}
      {...props}
    />
  )
}

function AttachmentAction({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="attachment-action"
      className={cn(
        "flex size-7 items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all outline-none cursor-pointer [&_svg]:size-4",
        className
      )}
      {...props}
    />
  )
}

export {
  AttachmentGroup,
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
}
