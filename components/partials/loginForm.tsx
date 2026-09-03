"use client";

import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginFormProps = {
	onBack: () => void;
};

export default function LoginForm({ onBack }: LoginFormProps) {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState("");

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsLoading(true);
		setMessage("");

		const { error } = await createClient().auth.signInWithPassword({ email, password });
		if (error) {
			setIsLoading(false);
			setMessage(error.message);
			return;
		}

		router.push("/pages/home");
	}

	async function handleGoogleSignIn() {
		setIsLoading(true);
		setMessage("");

		const { error } = await createClient().auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: `${window.location.origin}/auth/callback`,
				queryParams: { prompt: "select_account" },
			},
		});

		if (error) {
			setIsLoading(false);
			setMessage(error.message);
		}
	}

	return (
		<Card className="login-card border-[#e8e5df] bg-white/85 shadow-[0_18px_50px_rgba(61,65,52,.08)] backdrop-blur-sm">
			<CardHeader className="gap-0 px-7 pb-5 pt-1">
				<Button className="back-link -ml-3 mb-6 h-8 w-fit gap-2 rounded-full px-3" variant="ghost" size="sm" onClick={onBack}>
					<ArrowLeft aria-hidden="true" size={13} />
					Back to youme
				</Button>
				<CardTitle>
					<h1>Welcome back.</h1>
				</CardTitle>
				<CardDescription className="mt-3 max-w-[28rem] text-[13px] leading-6 text-[#7b8780]">
					Pick up where your conversations left off.
				</CardDescription>
			</CardHeader>
			<CardContent className="px-7 pb-6">
				<form className="login-form gap-5" onSubmit={handleSubmit}>
					<Button className="h-11 w-full gap-3 rounded-xl border-[#e2e5de] bg-white/70 text-[12px] text-[#23302d] shadow-none hover:bg-[#f8f7f4]" variant="outline" type="button" onClick={handleGoogleSignIn} disabled={isLoading}>
						<span className="grid size-5 place-items-center rounded-full bg-[#4285f4] text-[11px] font-bold text-white">G</span>
						Continue with Google
					</Button>
					<div className="flex items-center gap-3 text-[10px] text-[#a9afaa] before:h-px before:flex-1 before:bg-[#e8e5df] after:h-px after:flex-1 after:bg-[#e8e5df]">or continue with email</div>
					<div className="grid gap-2">
						<Label className="text-[10px] uppercase tracking-[.08em] text-[#607069]" htmlFor="email">Email address</Label>
						<Input className="h-11 rounded-xl border-[#e2e5de] bg-white/70 px-3 text-[12px] shadow-none placeholder:text-[#a9afaa] focus-visible:border-[#ef795f] focus-visible:ring-[#ef795f]/20" id="email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
					</div>
					<div className="grid gap-2">
						<div className="flex items-center justify-between">
							<Label className="text-[10px] uppercase tracking-[.08em] text-[#607069]" htmlFor="password">Password</Label>
							<Button className="password-label h-auto p-0 text-[10px] text-[#ef795f]" variant="link" size="sm" type="button">
								Forgot password?
							</Button>
						</div>
						<Input className="h-11 rounded-xl border-[#e2e5de] bg-white/70 px-3 text-[12px] shadow-none placeholder:text-[#a9afaa] focus-visible:border-[#ef795f] focus-visible:ring-[#ef795f]/20" id="password" type="password" placeholder="Your password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
					</div>
					<Button className="primary-button login-submit h-auto min-h-11 w-full justify-between rounded-xl px-4" type="submit" disabled={isLoading}>
						<span>{isLoading ? "Logging in..." : "Log in"}</span>
						<ArrowUpRight aria-hidden="true" size={16} />
					</Button>
					{message && <p className="text-[11px] text-[#7b8780]" role="status">{message}</p>}
				</form>
			</CardContent>
			<CardFooter className="flex-col gap-4 border-0 bg-transparent px-7 pb-7 pt-0">
				<p className="login-signup">New to youme? <a href="#start">Create an account</a></p>
				<div className="flex items-center gap-2 text-[10px] text-[#91a098]">
					<ShieldCheck aria-hidden="true" size={14} className="text-[#77a78a]" />
					Your conversations stay private.
				</div>
			</CardFooter>
		</Card>
	);
}
