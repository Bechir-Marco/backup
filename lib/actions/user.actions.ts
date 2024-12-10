"use server"

import { ID, Query } from "node-appwrite"
import { appwriteConfig } from "../appwrite/config"
import { createAdminClient } from "../appwrite"
import { parseStringify } from "../utils"
import { cookies } from "next/headers"

export const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient()

  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("email", [email])]
  )
  return result.total > 0 ? result.documents[0] : null
}
const handleError = (error: unknown, message: string) => {
  console.log(error, message)
  throw error
}
export const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient()
  try {
    const session = await account.createEmailToken(ID.unique(), email)
    return session.userId
  } catch (error) {
    handleError(error, "Failed to send email OTP")
  }
}
export const createAccount = async ({
  fullName,
  email
}: {
  fullName: string
  email: string
}) => {
  const existingUser = await getUserByEmail(email)
  const accountId = await sendEmailOTP({ email })
  if (!accountId) throw new Error("Failed to send an OTP")
  console.log("existingUser", existingUser)
  if (!existingUser) {
    const { databases } = await createAdminClient()
    console.log("databas", databases)
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        avatar:
          "https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png",
        accountId
      }
    )
  }
  return parseStringify({ accountId })
}
export const verifySecret = async ({
  accountId,
  password
}: {
  accountId: string
  password: string
}) => {
  try {
    const { account } = await createAdminClient()

    const session = await account.createSession(accountId, password)

    const cookieStore = await cookies()
    cookieStore.set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true
    })

    // Retourner les données de la session
    return parseStringify({ sessionId: session.$id })
  } catch (error) {
    handleError(error, "Failed to verify OTP")
  }
}