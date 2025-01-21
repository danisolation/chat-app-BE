import type { Request, Response } from "express";
import Group, { type IGroup } from "../models/Group";
import User from "../models/User";

export const createGroup = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const creator = (req as any).user.id;

    const group: IGroup = new Group({
      name,
      description,
      creator,
      members: [creator],
      admins: [creator],
    });

    await group.save();

    // Cập nhật user với group mới
    await User.findByIdAndUpdate(creator, { $push: { groups: group._id } });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tạo nhóm", error });
  }
};

export const getGroup = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate(
      "members",
      "username avatar"
    );

    if (!group) {
      res.status(404).json({ message: "Không tìm thấy nhóm" });
      return;
    }

    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy thông tin nhóm", error });
  }
};

export const updateGroup = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const userId = (req as any).user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      res.status(404).json({ message: "Không tìm thấy nhóm" });
      return;
    }

    if (!group.admins.includes(userId)) {
      res.status(403).json({ message: "Bạn không có quyền cập nhật nhóm này" });
      return;
    }

    group.name = name || group.name;
    group.description = description || group.description;

    await group.save();

    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật nhóm", error });
  }
};

export const addMember = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const adminId = (req as any).user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      res.status(404).json({ message: "Không tìm thấy nhóm" });
      return;
    }

    if (!group.admins.includes(adminId)) {
      res
        .status(403)
        .json({ message: "Bạn không có quyền thêm thành viên vào nhóm này" });
      return;
    }

    if (group.members.includes(userId)) {
      res.status(400).json({ message: "Người dùng đã là thành viên của nhóm" });
      return;
    }

    group.members.push(userId);
    await group.save();

    // Cập nhật user với group mới
    await User.findByIdAndUpdate(userId, { $push: { groups: groupId } });

    res.status(200).json(group);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi thêm thành viên vào nhóm", error });
  }
};

export const removeMember = async (req: Request, res: Response) => {
  try {
    const { groupId, userId } = req.params;
    const adminId = (req as any).user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      res.status(404).json({ message: "Không tìm thấy nhóm" });
      return;
    }

    if (!group.admins.includes(adminId)) {
      res
        .status(403)
        .json({ message: "Bạn không có quyền xóa thành viên khỏi nhóm này" });
      return;
    }

    group.members = group.members.filter(
      (member) => member.toString() !== userId
    );
    group.admins = group.admins.filter((admin) => admin.toString() !== userId);
    await group.save();

    // Cập nhật user, xóa group khỏi danh sách groups của user
    await User.findByIdAndUpdate(userId, { $pull: { groups: groupId } });

    res.status(200).json(group);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi xóa thành viên khỏi nhóm", error });
  }
};
