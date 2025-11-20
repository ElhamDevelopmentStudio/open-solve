"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu01Icon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";

type ReaderLink = {
  label: string;
  href: string;
  external?: boolean;
};

type ReaderMobileNavProps = {
  links: ReaderLink[];
  isLoggedIn: boolean;
};

export function ReaderMobileNav({ links, isLoggedIn }: ReaderMobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu01Icon className="h-5 w-5" strokeWidth={2} />
          <span className="sr-only">Open menu</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="rounded-t-[32px] border-t bg-background">
        <DrawerHeader>
          <DrawerTitle className="text-lg font-semibold">Navigate</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 px-4 pb-8">
          <nav className="space-y-2">
            {links.map((link) => (
              <Button
                key={link.href}
                variant="ghost"
                size="lg"
                asChild
                className="w-full justify-start rounded-2xl px-4 text-base"
                onClick={() => setOpen(false)}
              >
                <Link
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                >
                  {link.label}
                </Link>
              </Button>
            ))}
          </nav>
          <Separator />
          <div className="flex flex-col gap-2">
            {isLoggedIn ? (
              <Button asChild className="rounded-2xl">
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  Go to workspace
                </Link>
              </Button>
            ) : (
              <Button variant="outline" asChild className="rounded-2xl">
                <Link href="/sign-in" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
