import re

with open('src/components/LoginView.tsx', 'r') as f:
    content = f.read()

target = """          <button
            type="button"
            onClick={() => handleOAuthSubmit()}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border-2 border-slate-200 border-b-4 bg-white hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-wide active:border-b-0 active:translate-y-[4px] transition-all duration-75 select-none shadow-sm cursor-pointer"
          >
            <GoogleIcon />
            <span>{language === 'vi' ? 'Tiếp tục với Google' : 'Sign in with Google'}</span>
          </button>"""

replacement = """          <button
            type="button"
            onClick={() => handleOAuthSubmit()}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border-2 border-slate-200 border-b-4 bg-white hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-wide active:border-b-0 active:translate-y-[4px] transition-all duration-75 select-none shadow-sm cursor-pointer"
          >
            <GoogleIcon />
            <span>{language === 'vi' ? 'Tiếp tục với Google' : 'Sign in with Google'}</span>
          </button>

          <button
            type="button"
            onClick={() => onLogin('dev-user@readable.app')}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border-2 border-slate-200 border-b-4 bg-white hover:bg-slate-50 text-slate-500 font-black text-xs uppercase tracking-wide active:border-b-0 active:translate-y-[4px] transition-all duration-75 select-none shadow-sm cursor-pointer"
          >
            <span>{language === 'vi' ? 'Bỏ qua (Chế độ Dev)' : 'Skip (Dev Mode)'}</span>
          </button>"""

content = content.replace(target, replacement)

with open('src/components/LoginView.tsx', 'w') as f:
    f.write(content)

print("Added skip button")
