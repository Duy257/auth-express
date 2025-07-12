class commonCRUD {
  model: any;

  constructor(model: any) {
    this.model = model;
  }

  public create = async (req: any, res: any) => {
    try {
      const data = req.body;
      const newData = await this.model.create(data);
      return res.status(200).json(newData);
    } catch (error) {
      throw res.status(400).json(error);
    }
  };

  find = async (req: any, res: any) => {
    const query = req.query;
    try {
      const data = await this.model.find(query);
      return res.status(200).json(data);
    } catch (e) {
      throw res.status(400).json(e);
    }
  };

  public findOne = async (req: any, res: any) => {
    try {
      const id = req.params.id;
      const data = await this.model.findById(id);
      return res.status(200).json(data);
    } catch (error) {
      throw res.status(400).json(error);
    }
  };

  public update = async (req: any, res: any) => {
    try {
      const id = req.params.id;
      const data = req.body;

      const newData = await this.model.findOneAndUpdate({ _id: id }, data, {
        new: true,
      });
      return res.status(200).json(newData);
    } catch (error) {
      throw res.status(400).json(error);
    }
  };

  public delete = async (req: any, res: any) => {
    try {
      const id = req.params.id;
      const data = await this.model.deleteOne({ _id: id });
      return res.status(200).json(data);
    } catch (error) {
      throw res.status(400).json(error);
    }
  };
}

export default commonCRUD;
