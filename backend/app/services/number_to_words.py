# Chuyển đổi số tiền thành chữ tiếng Việt chuẩn hóa

NUMBERS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
UNITS = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"]

def _read_three_digits(n: int, show_zero_hundred: bool = False) -> str:
    h = n // 100
    t = (n % 100) // 10
    u = n % 10
    res = []
    
    if h > 0 or show_zero_hundred:
        res.append(NUMBERS[h] + " trăm")
        
    if t > 1:
        res.append(NUMBERS[t] + " mươi")
        if u == 1:
            res.append("mốt")
        elif u == 5:
            res.append("lăm")
        elif u > 0:
            res.append(NUMBERS[u])
    elif t == 1:
        res.append("mười")
        if u == 5:
            res.append("lăm")
        elif u > 0:
            res.append(NUMBERS[u])
    elif t == 0:
        if (h > 0 or show_zero_hundred) and u > 0:
            res.append("lẻ " + NUMBERS[u])
        elif u > 0:
            res.append(NUMBERS[u])
            
    return " ".join(res)

def number_to_vietnamese_words(amount: int | float) -> str:
    amount = int(round(amount))
    if amount == 0:
        return "Không đồng chẵn."
    if amount < 0:
        return "Âm " + number_to_vietnamese_words(abs(amount))
        
    groups = []
    temp = amount
    while temp > 0:
        groups.append(temp % 1000)
        temp //= 1000
        
    words = []
    for i in range(len(groups) - 1, -1, -1):
        grp = groups[i]
        if grp == 0:
            continue
        show_zero = (i < len(groups) - 1)
        grp_text = _read_three_digits(grp, show_zero_hundred=show_zero)
        unit = UNITS[i]
        if unit:
            words.append(f"{grp_text} {unit}")
        else:
            words.append(grp_text)
            
    result = " ".join(words).strip()
    result = result[0].upper() + result[1:] + " đồng chẵn."
    return result
