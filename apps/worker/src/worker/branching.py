from .task import BranchMode


BRANCH_MODE_INSTRUCTIONS: dict[BranchMode, str] = {
    BranchMode.EVOLVE: (
        "请基于参考图继续延展，保留整体视觉气质、材质语言与系列感，"
        "允许调整构图、镜头、细节与陪体，但不要无关地替换主题。"
    ),
    BranchMode.PRESERVE: (
        "请严格围绕参考图中的主体进行修改，尽量保持主体身份、核心轮廓、"
        "关键造型与辨识特征，仅按提示词做局部调整、补充或润饰。"
    ),
    BranchMode.TRANSFORM: (
        "请把参考图作为创作起点进行大幅改造，可以重构场景、风格、色彩与表现手法，"
        "但仍应与参考图存在可追溯的视觉关联。"
    ),
}


def compile_branch_prompt(prompt: str, branch_mode: BranchMode | None) -> str:
    normalized_prompt = prompt.strip()

    if branch_mode is None:
        return normalized_prompt

    instruction = BRANCH_MODE_INSTRUCTIONS[branch_mode]

    return f"{instruction}\n\n用户目标：{normalized_prompt}"
