"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const passwordChecks = [
		{ label: "At least 6 characters", complete: password.length >= 6 },
		{ label: "Both passwords match", complete: password.length > 0 && password === confirmation },
	];
	const completedChecks = passwordChecks.filter((check) => check.complete).length;

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (password !== confirmation) {
			toast.error("Passwords do not match.");
			return;
		}

		setIsLoading(true);
		const { error } = await createClient().auth.updateUser({ password });
		setIsLoading(false);

		if (error) {
			toast.error(error.message);
			return;
		}

		toast.success("Password updated successfully.");
		router.push("/pages/home");
	}

	return (
		<main className="app-shell reset-password-shell grid min-h-screen place-items-center">
			<div className="ambient ambient-one" />
			<div className="ambient ambient-two" />
			<Link className="reset-brand" href="/" aria-label="youme home">
				<span className="brand-mark">y</span>
				<span className="brand-wordmark">youme</span>
			</Link>
			<div className="reset-wordmark-field" aria-hidden="true">
				<span className="reset-wordmark reset-wordmark-one">youme</span>
				<span className="reset-wordmark reset-wordmark-two">youme</span>
				<span className="reset-wordmark reset-wordmark-three">youme</span>
			</div>
			<aside className="reset-context-panel" aria-label="Password requirements">
				<div className="reset-context-icon"><LockKeyhole aria-hidden="true" size={17} /></div>
				<p className="reset-context-eyebrow">Account security</p>
				<h2>Almost back in.</h2>
				<p className="reset-context-copy">A few quiet checks, then your account is ready.</p>
				<div className="reset-progress" aria-label={`${completedChecks} of ${passwordChecks.length} requirements complete`}>
					<span style={{ width: `${(completedChecks / passwordChecks.length) * 100}%` }} />
				</div>
				<ul className="reset-checks">
					{passwordChecks.map((check) => (
						<li className={check.complete ? "reset-check-complete" : ""} key={check.label}>
							<span className="reset-check-mark"><Check aria-hidden="true" size={12} /></span>
							{check.label}
						</li>
					))}
				</ul>
				<div className="reset-context-footer"><ShieldCheck aria-hidden="true" size={14} /> Encrypted recovery</div>
			</aside>
			<Card className="login-card reset-password-card w-full border-[#e8e5df] bg-white/85 shadow-[0_18px_50px_rgba(61,65,52,.08)] backdrop-blur-sm">
				<CardHeader className="gap-0 px-5 pb-5 pt-1 sm:px-7">
					<CardTitle><h1>Choose a <em>new</em> password.</h1></CardTitle>
				</CardHeader>
				<CardContent className="px-5 pb-6 sm:px-7">
					<form className="login-form gap-5" onSubmit={handleSubmit}>
						<div className="grid gap-2">
							<Label className="text-[10px] uppercase tracking-[.08em] text-[#607069]" htmlFor="new-password">New password</Label>
							<Input className="h-11 rounded-xl border-[#e2e5de] bg-white/70 px-3 text-[12px] shadow-none placeholder:text-[#a9afaa] focus-visible:border-[#ef795f] focus-visible:ring-[#ef795f]/20" id="new-password" type="password" placeholder="Choose a password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
						</div>
						<div className="grid gap-2">
							<Label className="text-[10px] uppercase tracking-[.08em] text-[#607069]" htmlFor="confirm-password">Confirm password</Label>
							<Input className="h-11 rounded-xl border-[#e2e5de] bg-white/70 px-3 text-[12px] shadow-none placeholder:text-[#a9afaa] focus-visible:border-[#ef795f] focus-visible:ring-[#ef795f]/20" id="confirm-password" type="password" placeholder="Repeat your password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={6} required />
						</div>
						<Button className="primary-button login-submit h-auto min-h-11 w-full justify-between rounded-xl px-4" type="submit" disabled={isLoading}>
							<span>{isLoading ? "Updating password..." : "Update password"}</span>
							<ArrowUpRight aria-hidden="true" size={16} />
						</Button>
					</form>
				</CardContent>
				<CardFooter className="flex-col gap-4 border-0 bg-transparent px-5 pb-7 pt-0 sm:px-7">
					<div className="flex items-center gap-2 text-[10px] text-[#91a098]"><ShieldCheck aria-hidden="true" size={14} className="text-[#77a78a]" />Your conversations stay private.</div>
				</CardFooter>
			</Card>
		</main>
	);
}
