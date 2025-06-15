module.exports = (sequelize, Sequelize) => {
  const RefreshToken = sequelize.define("refreshToken", {
    token: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    expires: {
      type: Sequelize.DATE,
      allowNull: false
    },
    createdByIp: {
      type: Sequelize.STRING,
      allowNull: false
    },
    revoked: {
      type: Sequelize.DATE,
      allowNull: true
    },
    revokedByIp: {
      type: Sequelize.STRING,
      allowNull: true
    },
    replacedByToken: {
      type: Sequelize.STRING,
      allowNull: true
    }
  });

  return RefreshToken;
};