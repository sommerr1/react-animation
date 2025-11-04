"""
Blender скрипт для создания куба с двумя текстурами и экспорта в GLB
Использование: В Blender открыть скрипт (Scripting workspace) и запустить (Run Script)
"""

import bpy
import os

# Очистка сцены
def clear_scene():
    """Удаляет все объекты и материалы из сцены"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    
    # Удаляем все материалы
    for material in bpy.data.materials:
        bpy.data.materials.remove(material)
    
    # Удаляем все текстуры
    for texture in bpy.data.textures:
        bpy.data.textures.remove(texture)
    
    # Удаляем все изображения
    for image in bpy.data.images:
        bpy.data.images.remove(image)

# Абсолютные пути к текстурам
TEXTURE1_PATH = r"C:\Users\HP\Downloads\дивансон\кожа_01.png"
TEXTURE2_PATH = r"C:\Users\HP\Downloads\дивансон\ткань01.png"

# Путь для экспорта GLB (можно изменить)
EXPORT_PATH = r"C:\Users\HP\Downloads\дивансон\textured_cube.glb"

def create_material_with_texture(material_name, texture_path):
    """
    Создает материал с текстурой
    
    Args:
        material_name: Имя материала
        texture_path: Абсолютный путь к файлу текстуры
    """
    # Проверяем существование файла
    if not os.path.exists(texture_path):
        print(f"ОШИБКА: Файл не найден: {texture_path}")
        return None
    
    # Создаем новый материал
    material = bpy.data.materials.new(name=material_name)
    material.use_nodes = True
    
    # Очищаем все ноды по умолчанию (кроме Material Output)
    material.node_tree.nodes.clear()
    
    # Добавляем необходимые ноды
    output_node = material.node_tree.nodes.new(type='ShaderNodeOutputMaterial')
    bsdf_node = material.node_tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    tex_node = material.node_tree.nodes.new(type='ShaderNodeTexImage')
    
    # Загружаем изображение
    try:
        image = bpy.data.images.load(texture_path)
        tex_node.image = image
        print(f"✓ Текстура загружена: {texture_path}")
    except Exception as e:
        print(f"ОШИБКА при загрузке изображения: {e}")
        return None
    
    # Располагаем ноды
    output_node.location = (300, 0)
    bsdf_node.location = (0, 0)
    tex_node.location = (-300, 0)
    
    # Подключаем ноды
    material.node_tree.links.new(tex_node.outputs['Color'], bsdf_node.inputs['Base Color'])
    material.node_tree.links.new(bsdf_node.outputs['BSDF'], output_node.inputs['Surface'])
    
    print(f"✓ Материал '{material_name}' создан")
    return material

def create_cube_with_materials():
    """Создает куб и применяет к нему материалы"""
    # Добавляем куб
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
    cube = bpy.context.active_object
    cube.name = "TexturedCube"
    
    # Создаем материалы
    material_t1 = create_material_with_texture("t1", TEXTURE1_PATH)
    material_t2 = create_material_with_texture("t2", TEXTURE2_PATH)
    
    if not material_t1 or not material_t2:
        print("ОШИБКА: Не удалось создать материалы")
        return False
    
    # Добавляем материалы к объекту (важно: порядок добавления определяет индексы)
    cube.data.materials.append(material_t1)  # Индекс 0
    cube.data.materials.append(material_t2)  # Индекс 1
    
    # Получаем доступ к граням куба
    mesh = cube.data
    # У куба 6 граней (индексы 0-5)
    # Применяем t1 к первым 3 граням (0, 1, 2)
    mesh.polygons[0].material_index = 0
    mesh.polygons[1].material_index = 0
    mesh.polygons[2].material_index = 0
    
    # Применяем t2 к остальным 3 граням (3, 4, 5)
    mesh.polygons[3].material_index = 1
    mesh.polygons[4].material_index = 1
    mesh.polygons[5].material_index = 1
    
    # Устанавливаем активный материал (для отображения в Blender)
    cube.active_material_index = 0
    
    print(f"✓ Куб создан с материалами t1 и t2")
    print(f"  - Материал t1 применен к 3 граням")
    print(f"  - Материал t2 применен к 3 граням")
    return True

def export_to_glb(filepath):
    """
    Экспортирует выбранные объекты в GLB формат
    
    Args:
        filepath: Путь для сохранения GLB файла
    """
    # Выбираем все объекты для экспорта
    bpy.ops.object.select_all(action='SELECT')
    
    # Настройки экспорта
    # В GLB формате текстуры автоматически встраиваются в файл
    
    # Список возможных вариантов параметров (для разных версий Blender)
    export_attempts = [
        # Попытка 1: Полный набор параметров
        {
            'filepath': filepath,
            'export_format': 'GLB',
            'use_selection': True,
            'export_materials': 'EXPORT',
            'export_normals': True,
        },
        # Попытка 2: Альтернативное имя параметра selection
        {
            'filepath': filepath,
            'export_format': 'GLB',
            'export_selected': True,
            'export_materials': 'EXPORT',
            'export_normals': True,
        },
        # Попытка 3: Минимальный набор
        {
            'filepath': filepath,
            'export_format': 'GLB',
            'export_materials': 'EXPORT',
        },
        # Попытка 4: Только формат
        {
            'filepath': filepath,
            'export_format': 'GLB',
        },
    ]
    
    # Пробуем экспортировать, пока не получится
    for i, params in enumerate(export_attempts, 1):
        try:
            bpy.ops.export_scene.gltf(**params)
            print(f"✓ Модель экспортирована (попытка {i}): {filepath}")
            return
        except TypeError as e:
            if i < len(export_attempts):
                print(f"Попытка {i} не удалась, пробуем следующий вариант...")
                continue
            else:
                raise Exception(f"Не удалось экспортировать GLB. Ошибка: {e}")

# Основная функция
def main():
    print("=" * 50)
    print("Начало выполнения скрипта")
    print("=" * 50)
    
    # Очистка сцены
    print("\n1. Очистка сцены...")
    clear_scene()
    
    # Создание куба с материалами
    print("\n2. Создание куба с материалами...")
    if not create_cube_with_materials():
        print("ОШИБКА: Не удалось создать куб с материалами")
        return
    
    # Экспорт в GLB
    print("\n3. Экспорт в GLB...")
    try:
        # Создаем директорию, если её нет
        export_dir = os.path.dirname(EXPORT_PATH)
        if export_dir and not os.path.exists(export_dir):
            os.makedirs(export_dir)
        
        export_to_glb(EXPORT_PATH)
    except Exception as e:
        print(f"ОШИБКА при экспорте: {e}")
        return
    
    print("\n" + "=" * 50)
    print("Скрипт выполнен успешно!")
    print("=" * 50)
    print(f"\nФайл сохранен: {EXPORT_PATH}")
    print("\nМатериалы в модели:")
    print("  - t1 (кожа)")
    print("  - t2 (ткань)")
    print("\nОба материала доступны для переключения в приложении!")

# Запуск скрипта
if __name__ == "__main__":
    main()

