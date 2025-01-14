import { CMS_URL, PAYLOAD_EMAIL, PAYLOAD_PASSWORD } from "astro:env/server"

type AuthResult = {
	message: string
	user: {
		id: string
		email: string
		_verified: boolean
		createdAt: string
		updatedAt: string
	}
	token: string
	exp: number
}

export async function authenticatePayload(): Promise<{
	error: string | null
	result: AuthResult | null
}> {
	const cmsUrl = new URL(CMS_URL)
	try {
		const req = await fetch(`${cmsUrl.origin}/api/users/login`, {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				email: PAYLOAD_EMAIL,
				password: PAYLOAD_PASSWORD,
			}),
		})
		const data = await req.json()
		if (!data.token) {
			if (data.message) return { error: data.message, result: null }
			if (data.errors) {
				return { error: JSON.stringify(data.errors), result: null }
			}
		}
		return { error: null, result: data }
	} catch (err) {
		if (typeof err === "string") {
			return { error: err, result: null }
		}
		return { error: JSON.stringify(err), result: null }
	}
}