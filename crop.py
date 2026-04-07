from PIL import Image
import os

input_path = "android-chrome-512x512.png"
output_path1 = "frontend/public/favicon.png"
output_path2 = "frontend/public/logo.png"

def auto_crop(image_path, save_paths):
    img = Image.open(image_path)
    
    # getbbox() calculates bounding box of the non-zero regions in the image
    box = img.getbbox()
    if box:
        print(f"Bordas achadas, recortando: {box}")
        img = img.crop(box)
    else:
        print("A imagem vazia ou não permitiu identificar borda... Ignorando corte.")
        
    for p in save_paths:
        img.save(p)
        print(f"Salvo em {p}")

auto_crop(input_path, [output_path1, output_path2])
print("Pronto!")
