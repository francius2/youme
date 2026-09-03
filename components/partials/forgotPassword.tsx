"use client";

import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ForgotPasswordProps = {
	onBack: () => void;
};

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsLoading(true);

		const { error } = await createClient().auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/reset-password`,
		});

		setIsLoading(false);
		if (error) {
			toast.error(error.message);
			return;
		}

		toast.success("Password reset link sent. Check your email.");
	}

	return (
		<Card className="login-card border-[#e8e5df] bg-white/85 shadow-[0_18px_50px_rgba(61,65,52,.08)] backdrop-blur-sm">
			<CardHeader className="gap-0 px-7 pb-5 pt-1">
				<Button className="back-link -ml-3 mb-6 h-8 w-fit gap-2 rounded-full px-3" variant="ghost" size="sm" onClick={onBack}>
					<ArrowLeft aria-hidden="true" size={13} />
					Back to login
				</Button>
				<CardTitle><h1>Reset your password.</h1></CardTitle>
			</CardHeader>
			<CardContent className="px-7 pb-6">
				<form className="login-form gap-5" onSubmit={handleSubmit}>
					<div className="grid gap-2">
						<Label className="text-[10px] uppercase tracking-[.08em] text-[#607069]" htmlFor="forgot-email">Email address</Label>
						<Input className="h-11 rounded-xl border-[#e2e5de] bg-white/70 px-3 text-[12px] shadow-none placeholder:text-[#a9afaa] focus-visible:border-[#ef795f] focus-visible:ring-[#ef795f]/20" id="forgot-email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
					</div>
					<Button className="primary-button login-submit h-auto min-h-11 w-full justify-between rounded-xl px-4" type="submit" disabled={isLoading}>
						<span>{isLoading ? "Sending link..." : "Send reset link"}</span>
						<ArrowUpRight aria-hidden="true" size={16} />
					</Button>
				</form>
			</CardContent>
			<CardFooter className="flex-col gap-4 border-0 bg-transparent px-7 pb-7 pt-0">
				<div className="flex items-center gap-2 text-[10px] text-[#91a098]"><ShieldCheck aria-hidden="true" size={14} className="text-[#77a78a]" />Your conversations stay private.</div>
			</CardFooter>
		</Card>
	);
}
