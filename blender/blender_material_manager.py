"""
Blender скрипт для управления материалами с диалоговым окном
Использование: 
1. В Blender открыть скрипт (Scripting workspace)
2. Запустить скрипт (Run Script)
3. В панели "N" (Properties) будет раздел "Material Manager"
"""

import bpy
import os
from pathlib import Path

# Пути к папкам с текстурами
MULTIPLE_TEXTURES_DIR = r"C:\Users\HP\Downloads\дивансон\textures\multiple"
SINGLE_TEXTURE_DIR = r"C:\Users\HP\Downloads\дивансон\textures\single"
EXPORT_DIR = r"C:\Users\HP\Downloads\дивансон\textures"

# Флаг для отслеживания материалов (для single материалов - не показывать в меню)
SINGLE_MATERIAL_PREFIX = "__SINGLE__"


def get_selected_objects(context):
    """
    Получает выделенные объекты, учитывая Edit Mode.
    Если в Edit Mode выделены грани/ребра/вершины, 
    возвращает редактируемый объект целиком.
    """
    selected_objects = []
    
    # Проверяем, находимся ли мы в Edit Mode с выделенными элементами
    if context.mode == 'EDIT_MESH' and context.edit_object:
        # Если в Edit Mode выделены грани/ребра/вершины, берем редактируемый объект
        obj = context.edit_object
        if obj.type == 'MESH':
            selected_objects.append(obj)
    
    # Если в Object Mode или нет выделенных элементов в Edit Mode
    if not selected_objects:
        selected_objects = [obj for obj in context.selected_objects if obj.type == 'MESH']
    
    return selected_objects


class MATERIAL_OT_apply_multiple(bpy.types.Operator):
    """Применяет множественные материалы из папки multiple к выделенным объектам"""
    bl_idname = "material.apply_multiple"
    bl_label = "Apply Multiple Materials"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        # Получаем выделенные объекты (с учетом Edit Mode)
        selected_objects = get_selected_objects(context)
        
        if not selected_objects:
            self.report(
                {'WARNING'}, 
                "Необходимо выбрать хотя бы один объект типа MESH! Выделите объект в Object Mode или Edit Mode."
            )
            return {'CANCELLED'}
        
        # Переключаемся в Object Mode для применения материалов
        if context.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')
        
        # Проверяем существование папки
        if not os.path.exists(MULTIPLE_TEXTURES_DIR):
            self.report({'ERROR'}, f"Папка не найдена: {MULTIPLE_TEXTURES_DIR}")
            return {'CANCELLED'}
        
        # Получаем список файлов текстур
        texture_files = []
        texture_dir = Path(MULTIPLE_TEXTURES_DIR)
        supported_extensions = ['*.png', '*.jpg', '*.jpeg', '*.bmp', '*.tiff', '*.tif']
        for ext in supported_extensions:
            found_files = list(texture_dir.glob(ext)) + list(texture_dir.glob(ext.upper()))
            texture_files.extend(found_files)
            if found_files:
                print(f"Найдено файлов с расширением {ext}: {len(found_files)}")
        
        # Убираем дубликаты (на случай, если есть и .PNG и .png)
        texture_files = list(set(texture_files))
        
        print(f"Всего найдено уникальных файлов текстур: {len(texture_files)}")
        for tf in texture_files:
            print(f"  - {tf.name} ({tf.suffix})")
        
        if not texture_files:
            self.report({'WARNING'}, f"Текстуры не найдены в: {MULTIPLE_TEXTURES_DIR}")
            return {'CANCELLED'}
        
        # Сортируем файлы по имени
        texture_files.sort(key=lambda x: x.name.lower())
        
        materials_to_apply = []
        failed_textures = []
        material_names_seen = {}  # Для отслеживания дубликатов имен
        
        for texture_file in texture_files:
            # Имя материала берем из имени файла (без расширения)
            material_name = texture_file.stem
            
            # Проверяем, не является ли это single материалом (с префиксом)
            if material_name.startswith(SINGLE_MATERIAL_PREFIX):
                continue  # Пропускаем материалы с префиксом single
            
            # Если материал с таким именем уже был обработан, добавляем расширение к имени
            if material_name in material_names_seen:
                # Уже есть материал с таким именем - добавляем расширение для уникальности
                material_name = f"{texture_file.stem}_{texture_file.suffix[1:]}"
                print(f"⚠ Обнаружен дубликат имени. Материал переименован: '{texture_file.stem}' -> '{material_name}'")
            else:
                material_names_seen[material_name] = texture_file.name
            
            # Создаем или обновляем материал
            if material_name not in bpy.data.materials:
                material = bpy.data.materials.new(name=material_name)
                material.use_nodes = True
                
                # Очищаем ноды
                material.node_tree.nodes.clear()
            else:
                material = bpy.data.materials[material_name]
                # Обновляем материал (пересоздаем ноды)
                material.use_nodes = True
                material.node_tree.nodes.clear()
            
            # Добавляем ноды
            output_node = material.node_tree.nodes.new(type='ShaderNodeOutputMaterial')
            bsdf_node = material.node_tree.nodes.new(type='ShaderNodeBsdfPrincipled')
            tex_node = material.node_tree.nodes.new(type='ShaderNodeTexImage')
            
            # Загружаем изображение
            try:
                image = bpy.data.images.load(str(texture_file))
                tex_node.image = image
                print(f"✓ Изображение '{texture_file.name}' успешно загружено")
            except Exception as e:
                error_msg = f"ОШИБКА при загрузке изображения '{texture_file.name}': {e}"
                print(error_msg)
                failed_textures.append((texture_file.name, str(e)))
                continue
            
            # Располагаем ноды
            output_node.location = (300, 0)
            bsdf_node.location = (0, 0)
            tex_node.location = (-300, 0)
            
            # Подключаем ноды
            material.node_tree.links.new(tex_node.outputs['Color'], bsdf_node.inputs['Base Color'])
            material.node_tree.links.new(bsdf_node.outputs['BSDF'], output_node.inputs['Surface'])
            
            materials_to_apply.append(material_name)
            print(f"✓ Материал '{material_name}' создан/обновлен из '{texture_file.name}'")
        
        # Выводим информацию о неудачных загрузках
        if failed_textures:
            print(f"\n⚠ Не удалось загрузить {len(failed_textures)} текстур:")
            for name, error in failed_textures:
                print(f"  - {name}: {error}")
        
        print(f"\nИтого успешно создано материалов: {len(materials_to_apply)}")
        print(f"Список материалов: {', '.join(materials_to_apply)}")
        
        if not materials_to_apply:
            self.report(
                {'ERROR'}, 
                f"Не удалось создать материалы! Проверьте:\n"
                f"1. Папка существует: {MULTIPLE_TEXTURES_DIR}\n"
                f"2. В папке есть файлы текстур (png, jpg и т.д.)\n"
                f"3. Файлы не повреждены"
            )
            return {'CANCELLED'}
        
        # Применяем материалы к выделенным объектам
        for obj in selected_objects:
            # Очищаем ВСЕ старые материалы (включая single материалы)
            obj.data.materials.clear()
            
            # Добавляем все материалы к объекту (только из папки multiple)
            applied_materials_count = 0
            for material_name in materials_to_apply:
                if material_name in bpy.data.materials:
                    material = bpy.data.materials[material_name]
                    obj.data.materials.append(material)
                    applied_materials_count += 1
                    print(f"Добавлен материал '{material_name}' к объекту '{obj.name}' (material slot {applied_materials_count - 1})")
            
            # Проверяем, что материалы действительно добавлены
            print(f"Материальные слоты объекта '{obj.name}': {len(obj.data.materials)}")
            for idx, mat in enumerate(obj.data.materials):
                print(f"  Slot [{idx}]: '{mat.name}'")
            
            # Если есть грани, распределяем материалы равномерно
            if obj.data.polygons and obj.data.materials:
                num_polygons = len(obj.data.polygons)
                num_materials = len(obj.data.materials)
                
                # Распределяем материалы по граням циклически
                for i, poly in enumerate(obj.data.polygons):
                    # Циклически распределяем материалы по граням
                    material_index = i % num_materials
                    poly.material_index = material_index
                
                print(f"Распределено {num_materials} материалов по {num_polygons} граням объекта '{obj.name}'")
                
                # Проверяем распределение материалов по граням
                material_distribution = {}
                for poly in obj.data.polygons:
                    idx = poly.material_index
                    material_distribution[idx] = material_distribution.get(idx, 0) + 1
                print(f"Распределение материалов по граням: {material_distribution}")
            elif not obj.data.materials:
                print(f"ВНИМАНИЕ: Не удалось добавить материалы к объекту '{obj.name}'")
        
        
        self.report({'INFO'}, f"Применено {len(materials_to_apply)} материалов к {len(selected_objects)} объектам")
        return {'FINISHED'}


class MATERIAL_OT_apply_single(bpy.types.Operator):
    """Применяет один материал из папки single к выделенным объектам"""
    bl_idname = "material.apply_single"
    bl_label = "Apply Single Material"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        # Получаем выделенные объекты (с учетом Edit Mode)
        selected_objects = get_selected_objects(context)
        
        if not selected_objects:
            self.report(
                {'WARNING'}, 
                "Необходимо выбрать хотя бы один объект типа MESH! Выделите объект в Object Mode или Edit Mode."
            )
            return {'CANCELLED'}
        
        # Переключаемся в Object Mode для применения материалов
        if context.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')
        
        # Проверяем существование папки
        if not os.path.exists(SINGLE_TEXTURE_DIR):
            self.report({'ERROR'}, f"Папка не найдена: {SINGLE_TEXTURE_DIR}")
            return {'CANCELLED'}
        
        # Получаем список файлов текстур
        texture_files = []
        texture_dir = Path(SINGLE_TEXTURE_DIR)
        supported_extensions = ['*.png', '*.jpg', '*.jpeg', '*.bmp', '*.tiff', '*.tif']
        for ext in supported_extensions:
            texture_files.extend(texture_dir.glob(ext))
            texture_files.extend(texture_dir.glob(ext.upper()))
        
        # Убираем дубликаты
        texture_files = list(set(texture_files))
        
        if not texture_files:
            self.report({'WARNING'}, f"Текстуры не найдены в: {SINGLE_TEXTURE_DIR}")
            return {'CANCELLED'}
        
        # Берем первый файл (если несколько - предупреждаем)
        texture_file = texture_files[0]
        if len(texture_files) > 1:
            self.report({'INFO'}, f"Найдено {len(texture_files)} файлов, используется первый: {texture_file.name}")
        
        # Имя материала берем из имени файла с префиксом для идентификации
        material_name = SINGLE_MATERIAL_PREFIX + texture_file.stem
        
        # Создаем или обновляем материал
        if material_name not in bpy.data.materials:
            material = bpy.data.materials.new(name=material_name)
            material.use_nodes = True
            
            # Очищаем ноды
            material.node_tree.nodes.clear()
        else:
            material = bpy.data.materials[material_name]
            # Обновляем материал (пересоздаем ноды для обновления текстуры)
            material.use_nodes = True
            material.node_tree.nodes.clear()
        
        # Добавляем ноды
        output_node = material.node_tree.nodes.new(type='ShaderNodeOutputMaterial')
        bsdf_node = material.node_tree.nodes.new(type='ShaderNodeBsdfPrincipled')
        tex_node = material.node_tree.nodes.new(type='ShaderNodeTexImage')
        
        # Загружаем изображение
        try:
            image = bpy.data.images.load(str(texture_file))
            tex_node.image = image
        except Exception as e:
            self.report({'ERROR'}, f"Ошибка при загрузке изображения: {e}")
            return {'CANCELLED'}
        
        # Располагаем ноды
        output_node.location = (300, 0)
        bsdf_node.location = (0, 0)
        tex_node.location = (-300, 0)
        
        # Подключаем ноды
        material.node_tree.links.new(tex_node.outputs['Color'], bsdf_node.inputs['Base Color'])
        material.node_tree.links.new(bsdf_node.outputs['BSDF'], output_node.inputs['Surface'])
        
        # Применяем материал ко всем выделенным объектам
        for obj in selected_objects:
            # Очищаем ВСЕ старые материалы (включая multiple материалы)
            obj.data.materials.clear()
            
            # Добавляем только один single материал
            obj.data.materials.append(material)
            
            # Применяем материал ко всем граням
            if obj.data.polygons:
                for poly in obj.data.polygons:
                    poly.material_index = 0
        
        
        self.report({'INFO'}, f"Применен материал '{texture_file.stem}' к {len(selected_objects)} объектам")
        return {'FINISHED'}


class MATERIAL_OT_export_glb(bpy.types.Operator):
    """Экспортирует выделенные объекты в GLB формат"""
    bl_idname = "material.export_glb"
    bl_label = "Export GLB"
    bl_options = {'REGISTER', 'UNDO'}
    
    # Свойство для имени файла
    filepath: bpy.props.StringProperty(
        name="File Path",
        description="Путь для сохранения GLB файла",
        default=os.path.join(EXPORT_DIR, "export.glb"),
        maxlen=1024,
        subtype='FILE_PATH'
    )
    
    def invoke(self, context, event):
        # Убеждаемся, что папка для экспорта существует
        if not os.path.exists(EXPORT_DIR):
            os.makedirs(EXPORT_DIR)
        
        # Устанавливаем путь по умолчанию
        self.filepath = os.path.join(EXPORT_DIR, "export.glb")
        
        # Открываем диалог выбора файла
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}
    
    def execute(self, context):
        # Получаем выделенные объекты (с учетом Edit Mode)
        selected_objects = get_selected_objects(context)
        
        if not selected_objects:
            self.report(
                {'WARNING'}, 
                "Необходимо выбрать хотя бы один объект типа MESH! Выделите объект в Object Mode или Edit Mode."
            )
            return {'CANCELLED'}
        
        # Переключаемся в Object Mode для экспорта
        if context.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')
        
        # Выбираем все выделенные объекты
        bpy.ops.object.select_all(action='DESELECT')
        for obj in selected_objects:
            obj.select_set(True)
        
        # Настройки экспорта (используем логику из create_textured_cube.py)
        # В GLB формате текстуры автоматически встраиваются в файл
        
        # Список возможных вариантов параметров (для разных версий Blender)
        export_attempts = [
            # Попытка 1: Полный набор параметров с экспортом материалов
            {
                'filepath': self.filepath,
                'export_format': 'GLB',
                'use_selection': True,
                'export_materials': 'EXPORT',
                'export_normals': True,
            },
            # Попытка 2: Альтернативное имя параметра selection
            {
                'filepath': self.filepath,
                'export_format': 'GLB',
                'export_selected': True,
                'export_materials': 'EXPORT',
                'export_normals': True,
            },
            # Попытка 3: Минимальный набор с материалами
            {
                'filepath': self.filepath,
                'export_format': 'GLB',
                'export_materials': 'EXPORT',
            },
            # Попытка 4: Только формат (без параметров материалов)
            {
                'filepath': self.filepath,
                'export_format': 'GLB',
            },
        ]
        
        # Пробуем экспортировать, пока не получится
        for i, params in enumerate(export_attempts, 1):
            try:
                bpy.ops.export_scene.gltf(**params)
                self.report({'INFO'}, f"Экспортировано {len(selected_objects)} объектов (попытка {i}): {self.filepath}")
                # Проверяем количество материалов в экспортированном файле
                print(f"✓ Экспорт успешен. Использованы параметры попытки {i}")
                return {'FINISHED'}
            except TypeError as e:
                if i < len(export_attempts):
                    print(f"Попытка {i} не удалась (TypeError), пробуем следующий вариант...")
                    continue
                else:
                    self.report({'ERROR'}, f"Не удалось экспортировать GLB. Ошибка: {e}")
                    return {'CANCELLED'}
            except Exception as e:
                if i < len(export_attempts):
                    print(f"Попытка {i} не удалась, пробуем следующий вариант...")
                    continue
                else:
                    self.report({'ERROR'}, f"Ошибка экспорта: {e}")
                    return {'CANCELLED'}
        
        return {'FINISHED'}


class MATERIAL_PT_panel(bpy.types.Panel):
    """Панель для управления материалами"""
    bl_label = "Material Manager"
    bl_idname = "MATERIAL_PT_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Material Manager"
    
    def draw(self, context):
        layout = self.layout
        
        # Информация о выделенных объектах
        selected_objects = [obj for obj in context.selected_objects if obj.type == 'MESH']
        if selected_objects:
            box = layout.box()
            box.label(text=f"Выделено объектов: {len(selected_objects)}", icon='OBJECT_DATA')
        
        # Кнопка Multiple
        row = layout.row()
        row.scale_y = 2.0
        op = row.operator("material.apply_multiple", text="Multiple", icon='MATERIAL')
        
        # Кнопка Single
        row = layout.row()
        row.scale_y = 2.0
        op = row.operator("material.apply_single", text="Single", icon='MATERIAL_DATA')
        
        # Кнопка Export GLB
        row = layout.row()
        row.scale_y = 2.0
        op = row.operator("material.export_glb", text="Export GLB", icon='EXPORT')
        
        # Информация о путях
        box = layout.box()
        box.label(text="Пути к текстурам:", icon='INFO')
        box.label(text=f"Multiple: {MULTIPLE_TEXTURES_DIR}", icon='FILEBROWSER')
        box.label(text=f"Single: {SINGLE_TEXTURE_DIR}", icon='FILEBROWSER')
        box.label(text=f"Export GLB: {EXPORT_DIR}", icon='EXPORT')


# Регистрация классов
classes = (
    MATERIAL_OT_apply_multiple,
    MATERIAL_OT_apply_single,
    MATERIAL_OT_export_glb,
    MATERIAL_PT_panel,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
    print("Material Manager зарегистрирован!")
    print("Откройте панель 'N' (Properties) и найдите раздел 'Material Manager'")

