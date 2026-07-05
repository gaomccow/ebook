import re

file_path = '/Users/gaothecow/ebook/src/components/TrophyRoom.tsx'
with open(file_path, 'r') as f:
    content = f.read()

content = content.replace("favorites[carouselIndex]", "favorites[carouselIndex % Math.max(1, favorites.length)]")

with open(file_path, 'w') as f:
    f.write(content)
