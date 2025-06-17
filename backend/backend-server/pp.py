import google.generativeai as genai

# Replace with your actual API key
genai.configure(api_key="AIzaSyDXalvz1CO7m16HyYKFTmKLXGyR1dfchaA")

# Choose a supported model
model = genai.GenerativeModel('models/gemini-1.5-pro-latest')

try:
    response = model.generate_content("What is the capital of France?")
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)
