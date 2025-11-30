export const getColorStyle = (colorName) => {
    if (!colorName) return { backgroundColor: '#ccc' };

    const lowerColor = colorName.toLowerCase().trim();
    
    // Map các tên màu thông dụng sang mã Hex chuẩn
    const colorMap = {
        'white': '#FFFFFF',
        'black': '#000000',
        'red': '#EF4444',
        'blue': '#3B82F6',
        'green': '#10B981',
        'yellow': '#F59E0B',
        'purple': '#8B5CF6',
        'pink': '#EC4899',
        'gray': '#6B7280',
        'orange': '#F97316',
        'navy': '#1E3A8A',
        'beige': '#F5F5DC',
        'brown': '#78350F'
    };

    // Nếu tên màu có trong map thì lấy, không thì dùng chính tên đó (cho trường hợp mã hex hoặc tên chuẩn CSS)
    const bg = colorMap[lowerColor] || lowerColor;

    return { 
        backgroundColor: bg,
        // Nếu màu là trắng, thêm viền để dễ nhìn
        border: lowerColor === 'white' || lowerColor === '#ffffff' ? '1px solid #e5e7eb' : 'none' 
    };
};