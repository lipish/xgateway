import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { t } from "@/lib/i18n"
import { useAuth } from "@/lib/auth"
import { Eye, EyeOff, ArrowRight, Shield, Globe, Zap, CheckCircle2 } from "lucide-react"
import { LanguageSwitcher } from "@/components/language-switcher"

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      if (isForgotPassword) {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        })

        const data = await response.json()

        if (data.success) {
          setSuccess(data.message || "Password reset link sent to your email")
          setTimeout(() => {
            setIsForgotPassword(false)
            setIsLogin(true)
          }, 2000)
        } else {
          setError(data.message || "Failed to send reset link")
        }
      } else if (isLogin) {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        })

        const data = await response.json()

        if (data.success) {
          login(data.data.user, data.data.token)
          navigate("/")
        } else {
          setError(data.message || "Login failed")
        }
      } else {
        if (password !== confirmPassword) {
          setError("Passwords do not match")
          setLoading(false)
          return
        }

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        })

        const data = await response.json()

        if (data.success) {
          setSuccess(data.message || "Registration successful! Please login.")
          setTimeout(() => {
            setIsLogin(true)
          }, 2000)
        } else {
          setError(data.message || "Registration failed")
        }
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  }

  return (
    <div className="min-h-screen bg-[#fcfdff] flex overflow-hidden">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      {/* Left Branding Area - Light Theme */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#f8f9ff] relative overflow-hidden items-center justify-center">
        {/* Soft Background Glows */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[10%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 px-12 xl:px-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-10"
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground/90">XGateway</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl font-bold text-foreground mb-4 leading-tight"
          >
            {t("auth.brandingTitle") || "统一管理您的"} <br />
            <span className="text-primary">{t("auth.brandingSubtitle") || "AI 模型服务"}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-muted-foreground/80 max-w-lg mb-16 leading-relaxed"
          >
            {t("auth.brandingDescription") || "高效、安全、可观测的 LLM API 网关，帮助您轻松管理多个模型服务商，实现智能路由与负载均衡。"}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex gap-12"
          >
            {[
              { value: "30+", label: t("auth.statProviders") || "服务商支持" },
              { value: "99.9%", label: t("auth.statUptime") || "服务可用性" },
              { value: "<50ms", label: t("auth.statLatency") || "平均延迟" }
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="text-3xl font-bold text-foreground">{item.value}</div>
                <div className="text-sm text-muted-foreground/60">{item.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-white relative">
        <div className="w-full max-w-[440px]">
          <div className="bg-white border border-slate-200 rounded-[32px] p-10 lg:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={isForgotPassword ? "forgot" : isLogin ? "login" : "register"}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="mb-10 text-center">
                  <h2 className="text-3xl font-bold text-foreground mb-3">
                    {isForgotPassword 
                      ? (t("auth.forgotPassword") || "忘记密码") 
                      : isLogin 
                        ? (t("auth.loginTitle") || "欢迎回来") 
                        : (t("auth.register") || "立即注册")}
                  </h2>
                  <p className="text-muted-foreground/70 text-[15px]">
                    {isForgotPassword
                      ? (t("auth.forgotPasswordDescription") || "输入您的邮箱以重置密码")
                      : isLogin 
                        ? (t("auth.loginDescription") || "登录以继续管理您的服务") 
                        : (t("auth.registerDescription") || "创建一个新账户以开始管理。")}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-[14px] font-semibold text-foreground/80 ml-1">
                      {t("users.username") || "邮箱地址"}
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder={t("users.usernamePlaceholder") || "your@email.com"}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-12 bg-[#f9fafb] border-transparent focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all rounded-xl px-4"
                      required
                      autoFocus
                    />
                  </div>

                  {!isForgotPassword && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <Label htmlFor="password" className="text-[14px] font-semibold text-foreground/80">
                            {t("users.password") || "密码"}
                          </Label>
                        </div>
                        <div className="relative group">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder={t("users.passwordPlaceholder") || "输入您的密码"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-12 bg-[#f9fafb] border-transparent focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all rounded-xl px-4 pr-12"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors p-1"
                          >
                            {showPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        {isLogin && (
                          <div className="flex justify-end pr-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsForgotPassword(true)
                                setError("")
                                setSuccess("")
                              }}
                              className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                              {t("auth.forgotPassword") || "忘记密码？"}
                            </button>
                          </div>
                        )}
                      </div>

                      {!isLogin && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-2"
                        >
                          <Label htmlFor="confirmPassword" className="text-[14px] font-semibold text-foreground/80 ml-1">
                            {t("auth.confirmPassword") || "确认密码"}
                          </Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder={t("auth.confirmPasswordPlaceholder") || "请再次输入密码"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-12 bg-[#f9fafb] border-transparent transition-all rounded-xl px-4"
                            required
                          />
                        </motion.div>
                      )}
                    </>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 text-sm text-destructive bg-destructive/5 border border-destructive/10 rounded-xl"
                    >
                      {error}
                    </motion.div>
                  )}

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl"
                    >
                      {success}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all rounded-xl"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t("common.loading") || "处理中..."}
                      </span>
                    ) : (
                      <>
                        {isForgotPassword 
                          ? (t("auth.sendResetLink") || "发送重置链接")
                          : isLogin 
                            ? (t("auth.login") || "登录") 
                            : (t("auth.register") || "创建账户")}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 text-center">
              {isForgotPassword ? (
                <p className="text-[14px] text-muted-foreground/70">
                  {t("auth.rememberPassword") || "记起密码了？"}
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false)
                      setIsLogin(true)
                      setError("")
                      setSuccess("")
                    }}
                    className="ml-2 text-primary font-bold hover:underline underline-offset-4"
                  >
                    {t("auth.loginNow") || "立即登录"}
                  </button>
                </p>
              ) : (
                <p className="text-[14px] text-muted-foreground/70">
                  {isLogin ? (t("auth.noAccount") || "还没有账户？") : (t("auth.hasAccount") || "已经有账户了？")}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin)
                      setError("")
                      setSuccess("")
                    }}
                    className="ml-2 text-primary font-bold hover:underline underline-offset-4"
                  >
                    {isLogin ? (t("auth.registerNow") || "立即注册") : (t("auth.loginNow") || "立即登录")}
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}