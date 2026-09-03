"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
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
		<main className="app-shell grid min-h-screen place-items-center">
			<Card className="login-card border-[#e8e5df] bg-white/85 shadow-[0_18px_50px_rgba(61,65,52,.08)] backdrop-blur-sm">
				<CardHeader className="gap-0 px-7 pb-5 pt-1">
					<CardTitle><h1>Choose a new password.</h1></CardTitle>
				</CardHeader>
				<CardContent className="px-7 pb-6">
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
				<CardFooter className="flex-col gap-4 border-0 bg-transparent px-7 pb-7 pt-0">
					<div className="flex items-center gap-2 text-[10px] text-[#91a098]"><ShieldCheck aria-hidden="true" size={14} className="text-[#77a78a]" />Your conversations stay private.</div>
				</CardFooter>
			</Card>
		</main>
	);
}
