import { ActionError, defineAction } from "astro:actions"
import { z } from "astro:schema"
import { CMS_URL, LISTMONK_API_KEY, LISTMONK_API_LIST, LISTMONK_API_URL, LISTMONK_API_USER } from "astro:env/server"

const cmsUrl = new URL(CMS_URL)
export const server = {
	login: defineAction({
		accept: "form",
		input: z.object({
			email: z.string().email(),
			password: z.string(),
		}),
		handler: async ({ email, password }, ctx) => {
			const headers = new Headers({
				"Content-Type": "application/json",
			})

			const res = await fetch(`${cmsUrl.origin}/api/users/login`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					email,
					password,
				}),
			}).catch((e) => {
				throw new ActionError({
					code: "UNAUTHORIZED",
					message: e,
				})
			})
			if (res.status !== 200) {
				console.error("Wrong status")
				throw new ActionError({
					code: "UNAUTHORIZED",
					message: "Invalid email or password",
				})
			}
			// // Log res headers
			const setCookie = res.headers.get("set-cookie")

			let cookie
			const values = setCookie?.split(";")
			if (!values) return
			for (const value of values) {
				const pair = value.split("=")
				const key = pair[0].trim() as string | undefined
				const val = pair[1].trim() as string | undefined
				if (!key || !val) continue
				if (!cookie) {
					cookie = {
						[key]: val,
					}
				} else {
					cookie[key] = val as string
				}
			}

			if (!cookie || !cookie["payload-token"]) {
				throw new ActionError({
					code: "UNAUTHORIZED",
					message: "Couldnt parse cookie",
				})
			}
			ctx.cookies.set("payload-token", cookie["payload-token"], {
				sameSite: "lax",
				path: cookie["Path"],
				httpOnly: true,
				expires: new Date(cookie["Expires"]),
			})
			return true
		},
	}),
	verify: defineAction({
		handler: async (_, ctx) => {
			const headers = new Headers({
				"Content-Type": "application/json",
				Authorization: ctx.cookies.get("payload-token")?.value
					? `JWT ${ctx.cookies.get("payload-token")!.value}`
					: "",
			})

			const res = await fetch(`${cmsUrl.origin}/api/users/me`, {
				method: "GET",
				headers,
			})

			const body = (await res.json()) as {
				user:
				| undefined
				| {
					id: number
					name: string
					email: string
					loginAttempts: number
				}
				message: "Account"
			}

			return body.user
		},
	}),
	logout: defineAction({
		handler: async (_, ctx) => {
			// const res = await fetch(`${cmsUrl}/api/users/logout`, {
			// 	method: "POST",
			// 	headers: {
			// 		"Content-Type": "application/json",
			// 	},
			// })
			ctx.cookies.delete("payload-token", {
				path: "/",
				sameSite: "lax",
			})
		},
	}),
	subscribe: defineAction({
		input: z.object({
			name: z.string().optional(),
			email: z.string().email(),
		}),
		handler: async ({ name, email }) => {
			const apiURL = new URL(LISTMONK_API_URL)
			const res = await fetch(`${apiURL.origin}/api/subscribers`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `token ${LISTMONK_API_USER}:${LISTMONK_API_KEY}`,
				},
				body: JSON.stringify({
					email: email,
					name: name,
					list_uuids: [LISTMONK_API_LIST],
				}),
			})
			if (res.status !== 200) {
				throw new ActionError({
					code: "BAD_REQUEST",
					message: await res.json().then((data) => data.message),
				});
			}
			return res.json()
		},
	}),
}
