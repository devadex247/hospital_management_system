import streamlit as st

def apply_custom_styles():
    """
    Applies custom CSS for a minimalistic, premium look.
    """
    st.markdown("""
    <style>
        .reportview-container .main .block-container {
            padding-top: 2rem;
            padding-right: 2rem;
            padding-left: 2rem;
            padding-bottom: 2rem;
        }
        h1, h2, h3 {
            font-family: 'Inter', sans-serif;
            color: #2c3e50;
        }
        .stButton>button {
            background-color: #3498db;
            color: white;
            border-radius: 8px;
            border: none;
            padding: 0.5rem 1rem;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .stButton>button:hover {
            background-color: #2980b9;
            transform: translateY(-2px);
        }
        .metric-card {
            background-color: #f8f9fa;
            border-radius: 10px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            text-align: center;
        }
    </style>
    """, unsafe_allow_html=True)
