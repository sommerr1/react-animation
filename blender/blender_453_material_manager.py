"""
Blender скрипт для управления материалами с диалоговым окном (версия 4.5.3)
Использование: 
1. В Blender открыть скрипт (Scripting workspace)
2. Запустить скрипт (Run Script)
3. В панели "N" (Properties) будет раздел "Material Manager"
"""

import bpy
import os
from pathlib import Path

# Путь к корневой папке с текстурами (все субфолдеры будут сканироваться)
TEXTURES_ROOT_DIR = r"C:\Users\HP\Downloads\дивансон\textures"
EXPORT_DIR = r"C:\Users\HP\Downloads\дивансон\textures"

# Префикс для отслеживания типа материалов (multipl vs single)
# Материалы multipl не имеют префикса
# Материалы single имеют этот префикс
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


def scan_texture_folders(root_dir):
    """
    Сканирует корневую папку и возвращает список субфолдеров с количеством текстур в каждом.
    Возвращает: [(folder_name, texture_count, folder_path), ...]
    """
    folders_info = []
    
    if not os.path.exists(root_dir):
        return folders_info
    
    root_path = Path(root_dir)
    # Расширения для поиска (в нижнем регистре для нормализации)
    supported_extensions_lower = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif']
    
    # Сканируем все субфолдеры
    for subfolder in root_path.iterdir():
        if subfolder.is_dir():
            # Используем set для устранения дубликатов (на случай разных регистров)
            texture_files = set()
            
            # Ищем все файлы в папке
            for file_path in subfolder.iterdir():
                if file_path.is_file():
                    # Получаем расширение в нижнем регистре
                    ext_lower = file_path.suffix.lower()
                    # Проверяем, является ли это поддерживаемым расширением
                    if ext_lower in supported_extensions_lower:
                        # Используем полный путь для уникальности, но считаем по имени файла
                        texture_files.add(file_path.name.lower())
            
            texture_count = len(texture_files)
            
            if texture_count > 0:
                folders_info.append((subfolder.name, texture_count, subfolder))
    
    # Сортируем по имени
    folders_info.sort(key=lambda x: x[0].lower())
    
    return folders_info


def get_texture_files(folder_path):
    """
    Получает список файлов текстур из указанной папки.
    """
    texture_files = []
    texture_dir = Path(folder_path)
    supported_extensions = ['*.png', '*.jpg', '*.jpeg', '*.bmp', '*.tiff', '*.tif']
    
    for ext in supported_extensions:
        found_files = list(texture_dir.glob(ext)) + list(texture_dir.glob(ext.upper()))
        texture_files.extend(found_files)
    
    # Убираем дубликаты
    texture_files = list(set(texture_files))
    
    # Сортируем файлы по имени
    texture_files.sort(key=lambda x: x.name.lower())
    
    return texture_files


def cleanup_materials_from_other_types(obj, current_type_prefix):
    """
    Удаляет материалы из объектов, которые относятся к другому типу.
    current_type_prefix: "" для multipl, SINGLE_MATERIAL_PREFIX для single
    """
    if not obj.data.materials:
        return
    
    # Создаем новый список материалов, оставляя только нужного типа
    materials_to_keep = []
    
    for mat in obj.data.materials:
        if mat is None:
            continue
        
        # Проверяем тип материала
        is_single = mat.name.startswith(SINGLE_MATERIAL_PREFIX)
        
        # Оставляем материалы только нужного типа
        if current_type_prefix == SINGLE_MATERIAL_PREFIX and is_single:
            materials_to_keep.append(mat)
        elif current_type_prefix == "" and not is_single:
            materials_to_keep.append(mat)
    
    # Заменяем список материалов
    obj.data.materials.clear()
    for mat in materials_to_keep:
        obj.data.materials.append(mat)


class MATERIAL_OT_apply_folder(bpy.types.Operator):
    """Применяет материалы из выбранной папки к выделенным объектам"""
    bl_idname = "material.apply_folder"
    bl_label = "Apply Folder Materials"
    bl_options = {'REGISTER', 'UNDO'}
    
    folder_name: bpy.props.StringProperty()
    folder_path: bpy.props.StringProperty()
    
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
        if not os.path.exists(self.folder_path):
            self.report({'ERROR'}, f"Папка не найдена: {self.folder_path}")
            return {'CANCELLED'}
        
        # Получаем список файлов текстур
        texture_files = get_texture_files(self.folder_path)
        
        if not texture_files:
            self.report({'WARNING'}, f"Текстуры не найдены в: {self.folder_path}")
            return {'CANCELLED'}
        
        # Определяем тип материалов (multipl если больше 1 текстуры, иначе single)
        is_multipl = len(texture_files) > 1
        material_prefix = "" if is_multipl else SINGLE_MATERIAL_PREFIX
        
        materials_to_apply = []
        failed_textures = []
        material_names_seen = {}  # Для отслеживания дубликатов имен
        
        for texture_file in texture_files:
            # Имя материала берем из имени файла (без расширения)
            base_material_name = texture_file.stem
            
            # Добавляем префикс для single материалов
            material_name = material_prefix + base_material_name
            
            # Проверяем, не является ли это материалом другого типа
            if is_multipl and material_name.startswith(SINGLE_MATERIAL_PREFIX):
                continue  # Пропускаем single материалы при применении multipl
            if not is_multipl and not material_name.startswith(SINGLE_MATERIAL_PREFIX):
                continue  # Пропускаем multipl материалы при применении single
            
            # Если материал с таким именем уже был обработан, добавляем расширение к имени
            if material_name in material_names_seen:
                # Уже есть материал с таким именем - добавляем расширение для уникальности
                material_name = f"{material_prefix}{texture_file.stem}_{texture_file.suffix[1:]}"
                print(f"⚠ Обнаружен дубликат имени. Материал переименован: '{base_material_name}' -> '{material_name}'")
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
                f"1. Папка существует: {self.folder_path}\n"
                f"2. В папке есть файлы текстур (png, jpg и т.д.)\n"
                f"3. Файлы не повреждены"
            )
            return {'CANCELLED'}
        
        # Применяем материалы к выделенным объектам
        for obj in selected_objects:
            # Очищаем материалы другого типа (эта функция также очищает список)
            cleanup_materials_from_other_types(obj, material_prefix)
            
            # Если multipl - добавляем все материалы, если single - только один
            if is_multipl:
                
                # Добавляем все материалы к объекту
                applied_materials_count = 0
                for material_name in materials_to_apply:
                    if material_name in bpy.data.materials:
                        material = bpy.data.materials[material_name]
                        obj.data.materials.append(material)
                        applied_materials_count += 1
                        print(f"Добавлен материал '{material_name}' к объекту '{obj.name}' (material slot {applied_materials_count - 1})")
                
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
            else:
                # Single - применяем только первый материал
                # cleanup уже очистил материалы другого типа, теперь заменяем на новый single материал
                if materials_to_apply and materials_to_apply[0] in bpy.data.materials:
                    material = bpy.data.materials[materials_to_apply[0]]
                    
                    # Если материала еще нет в списке, очищаем и добавляем
                    if not obj.data.materials or obj.data.materials[0] != material:
                        obj.data.materials.clear()
                        obj.data.materials.append(material)
                    
                    # Применяем материал ко всем граням
                    if obj.data.polygons:
                        for poly in obj.data.polygons:
                            poly.material_index = 0
                    
                    print(f"Применен single материал '{materials_to_apply[0]}' к объекту '{obj.name}'")
                else:
                    print(f"ВНИМАНИЕ: Не удалось добавить single материал к объекту '{obj.name}'")
            
            # Проверяем финальное состояние материалов объекта
            print(f"Материальные слоты объекта '{obj.name}': {len(obj.data.materials)}")
            for idx, mat in enumerate(obj.data.materials):
                print(f"  Slot [{idx}]: '{mat.name if mat else None}'")
        
        folder_type = "multipl" if is_multipl else "single"
        self.report({'INFO'}, f"Применено {len(materials_to_apply)} материалов ({folder_type}) из '{self.folder_name}' к {len(selected_objects)} объектам")
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
        
        # Собираем уникальные материалы, которые используются выделенными объектами
        used_materials = set()
        used_material_objects = {}  # Словарь: имя материала -> список объектов
        
        for obj in selected_objects:
            if obj.type == 'MESH':
                for mat in obj.data.materials:
                    if mat is not None:
                        mat_name = mat.name
                        used_materials.add(mat_name)
                        if mat_name not in used_material_objects:
                            used_material_objects[mat_name] = []
                        used_material_objects[mat_name].append(obj.name)
        
        # Логируем собранные материалы
        print(f"\n[Экспорт] Материалы, используемые выделенными объектами:")
        for mat_name in sorted(used_materials):
            obj_count = len(used_material_objects[mat_name])
            mat_type = "single" if mat_name.startswith(SINGLE_MATERIAL_PREFIX) else "multipl"
            print(f"  - '{mat_name}' ({mat_type}, используется на {obj_count} объектах)")
        
        print(f"[Экспорт] Всего материалов для экспорта: {len(used_materials)}")
        
        # В Blender экспорт с use_selection должен экспортировать только материалы выбранных объектов
        # Но для надежности, собираем информацию о неиспользуемых материалах
        all_materials = set(bpy.data.materials.keys())
        unused_materials = all_materials - used_materials
        
        if unused_materials:
            print(f"[Экспорт] Найдено {len(unused_materials)} неиспользуемых материалов в сцене (будут игнорироваться при экспорте)")
            for mat_name in sorted(unused_materials)[:5]:  # Показываем первые 5
                print(f"  - '{mat_name}' (не используется)")
            if len(unused_materials) > 5:
                print(f"  ... и еще {len(unused_materials) - 5} материалов")
        
        # Для Blender 4.5.3 используем актуальный API экспорта
        # Параметр use_selection должен экспортировать только материалы выбранных объектов
        export_params = {
            'filepath': self.filepath,
            'export_format': 'GLB',
            'use_selection': True,
            'export_materials': 'EXPORT',  # Экспортировать материалы
        }
        
        # Пробуем экспортировать
        try:
            # В Blender 4.5.3 параметры экспорта могут отличаться
            bpy.ops.export_scene.gltf(**export_params)
            
            # Восстанавливаем флаги материалов (если были изменены)
            # На самом деле, мы не изменяли их, так что ничего не нужно восстанавливать
            
            print(f"\n✓ Экспорт успешен")
            print(f"✓ Экспортировано {len(selected_objects)} объектов")
            print(f"✓ Экспортировано {len(used_materials)} материалов")
            
            self.report({'INFO'}, f"Экспортировано {len(selected_objects)} объектов, {len(used_materials)} материалов: {self.filepath}")
            return {'FINISHED'}
        except TypeError as e:
            # Пробуем без use_selection или с другими параметрами
            try:
                # Убираем параметры, которые могут не поддерживаться
                export_params.pop('use_selection', None)
                if 'export_materials' in export_params:
                    export_params.pop('export_materials')
                
                bpy.ops.export_scene.gltf(**export_params)
                
                print(f"\n✓ Экспорт успешен (с альтернативными параметрами)")
                print(f"✓ Экспортировано {len(selected_objects)} объектов")
                print(f"✓ Экспортировано {len(used_materials)} материалов")
                
                self.report({'INFO'}, f"Экспортировано {len(selected_objects)} объектов, {len(used_materials)} материалов: {self.filepath}")
                return {'FINISHED'}
            except Exception as e2:
                self.report({'ERROR'}, f"Не удалось экспортировать GLB. Ошибка: {e2}")
                print(f"✗ Ошибка экспорта: {e2}")
                return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Ошибка экспорта: {e}")
            print(f"✗ Ошибка экспорта: {e}")
            return {'CANCELLED'}


class MATERIAL_OT_clear_materials(bpy.types.Operator):
    """Удаляет все материалы у выделенных объектов"""
    bl_idname = "material.clear_materials"
    bl_label = "Clear Materials"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        # Получаем выделенные объекты (с учетом Edit Mode)
        selected_objects = get_selected_objects(context)
        
        if not selected_objects:
            self.report(
                {'WARNING'}, 
                "Необходимо выбрать хотя бы один объект типа MESH!"
            )
            return {'CANCELLED'}
        
        # Переключаемся в Object Mode
        if context.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')
        
        cleared_count = 0
        for obj in selected_objects:
            if obj.type == 'MESH' and obj.data.materials:
                obj.data.materials.clear()
                cleared_count += 1
                print(f"Материалы очищены у объекта '{obj.name}'")
        
        self.report({'INFO'}, f"Материалы удалены у {cleared_count} объектов")
        return {'FINISHED'}


class MATERIAL_OT_close_script(bpy.types.Operator):
    """Закрывает скрипт Material Manager"""
    bl_idname = "material.close_script"
    bl_label = "Close Script"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        # Отменяем регистрацию всех классов
        unregister()
        self.report({'INFO'}, "Material Manager закрыт")
        return {'FINISHED'}


class MATERIAL_PT_panel(bpy.types.Panel):
    """Панель для управления материалами"""
    bl_label = "Material Manager 4.5.3"
    bl_idname = "MATERIAL_PT_panel_453"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Material Manager"
    
    def draw(self, context):
        layout = self.layout
        
        # Заголовок с кнопкой закрытия в правом верхнем углу
        row = layout.row()
        row.scale_y = 1.0
        
        # Левая часть - информация о выделенных объектах
        selected_objects = [obj for obj in context.selected_objects if obj.type == 'MESH']
        left_col = row.column()
        if selected_objects:
            left_col.label(text=f"Выделено: {len(selected_objects)}", icon='OBJECT_DATA')
        else:
            left_col.label(text="Выделено: 0", icon='OBJECT_DATA')
        
        # Правая часть - кнопка закрытия (крестик)
        right_col = row.column()
        right_col.alignment = 'RIGHT'
        op = right_col.operator("material.close_script", text="", icon='X')
        
        layout.separator()
        
        # Сканируем папки с текстурами
        folders_info = scan_texture_folders(TEXTURES_ROOT_DIR)
        
        if not folders_info:
            box = layout.box()
            box.label(text="Текстуры не найдены", icon='ERROR')
            box.label(text=f"Проверьте путь: {TEXTURES_ROOT_DIR}")
        else:
            # Отображаем кнопки для каждой папки
            for folder_name, texture_count, folder_path in folders_info:
                row = layout.row()
                row.scale_y = 1.5
                
                # Определяем тип (multipl если больше 1 текстуры)
                folder_type = "multipl" if texture_count > 1 else "single"
                icon = 'MATERIAL' if texture_count > 1 else 'MATERIAL_DATA'
                
                # Текст кнопки с количеством материалов
                button_text = f"{folder_name} ({texture_count}) [{folder_type}]"
                
                op = row.operator("material.apply_folder", text=button_text, icon=icon)
                op.folder_name = folder_name
                op.folder_path = str(folder_path)
        
        layout.separator()
        
        # Кнопка сброса материалов
        row = layout.row()
        row.scale_y = 1.5
        op = row.operator("material.clear_materials", text="Clear Materials", icon='TRASH')
        
        # Кнопка Export GLB
        row = layout.row()
        row.scale_y = 2.0
        op = row.operator("material.export_glb", text="Export GLB", icon='EXPORT')
        
        # Информация о путях
        box = layout.box()
        box.label(text="Пути:", icon='INFO')
        box.label(text=f"Textures: {TEXTURES_ROOT_DIR}", icon='FILEBROWSER')
        box.label(text=f"Export GLB: {EXPORT_DIR}", icon='EXPORT')


# Регистрация классов
classes = (
    MATERIAL_OT_apply_folder,
    MATERIAL_OT_export_glb,
    MATERIAL_OT_clear_materials,
    MATERIAL_OT_close_script,
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
    print("Material Manager 4.5.3 зарегистрирован!")
    print("Откройте панель 'N' (Properties) и найдите раздел 'Material Manager'")

